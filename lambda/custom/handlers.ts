import * as AWS from 'aws-sdk'
import * as Alexa from 'ask-sdk-core'
import axios from 'axios'
import { interfaces } from 'ask-sdk-model';

const AWS_CONFIG = { region: 'ap-northeast-1' }
const REPEAT_LIMIT = 10
const HELP_MESSAGE = '最新の夢日記をおしえて、と聞いてみてください。最新の内容を取得することができます。'
const HELP_REPROMPT = 'ご用件はなんでしょうか？'
const EXIT_MESSAGE = '<say-as interpret-as="interjection">おやすみなさい。良い夢を。</say-as>'

export const LaunchRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'LaunchRequest'
  },
  async handle(handlerInput) {
    const message = '最新の夢を読み上げますか？それともランダムに読み上げますか？'
    return handlerInput.responseBuilder
      .speak(message)
      .reprompt(message)
      .withSimpleCard('夢日記', message)
      .withShouldEndSession(false)
      .getResponse()
  }
}

export const NewestDreamRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'IntentRequest' && request.intent.name === 'NewestDreamIntent'
  },
  async handle(handlerInput) {
    const newestEntry = await getNewestEntry()
    const datasources = buildDataSources([newestEntry])
    const document = buildAplDocument()
    const command: interfaces.alexa.presentation.apl.SpeakItemCommand = {
      type: 'SpeakItem',
      componentId: `${newestEntry.publishedAt}`
    }

    if (!supportDisplay(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(newestEntry.content)
        .withSimpleCard('夢日記', newestEntry.content)
        .getResponse()
    }

    return handlerInput.responseBuilder
      .addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: 'system',
        document: document,
        datasources: datasources
      })
      .addDirective({
        type: 'Alexa.Presentation.APL.ExecuteCommands',
        token: 'system',
        commands: [command]
      })
      .withShouldEndSession(true)
      .getResponse()
  }
}

export const RepeatRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'IntentRequest' && request.intent.name === 'RepeatIntent'
  },
  async handle(handlerInput) {
    // 長過ぎる文章を読ませようとするとAlexaが読み上げられないので、適当な数にしとく
    const entries = await getAllEntry()
    const pickupedEntries = shuffle(entries).slice(0, REPEAT_LIMIT)
    const datasources = buildDataSources(pickupedEntries)
    const document = buildAplDocument()
    const commands = buildCommands(pickupedEntries)

    if (!supportDisplay(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(''.concat(...entries.map(el => el.content)))
        .getResponse()
    }

    return handlerInput.responseBuilder
      .addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: 'repeat',
        document: document,
        datasources: datasources
      })
      .addDirective({
        type: 'Alexa.Presentation.APL.ExecuteCommands',
        token: 'repeat',
        commands: commands
      })
      .withShouldEndSession(true)
      .getResponse()
  }
}

export const RecordRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'IntentRequest' && request.intent.name === 'RecordIntent'
  },
  async handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    const dreamSlot = request.type === 'IntentRequest' && request.intent.slots && request.intent.slots.dream.value
    const result = await postEntry(dreamSlot)

    if (result) {
      const message = `${dreamSlot}を記録しました`
      return handlerInput.responseBuilder
        .speak(message)
        .withSimpleCard('夢日記', message)
        .withShouldEndSession(true)
        .getResponse()
    } else {
      return handlerInput.responseBuilder
        .speak('記録に失敗しました。再度お試しください')
        .withShouldEndSession(true)
        .getResponse()
    }

  }
}

export const HelpHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent'
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_REPROMPT)
      .getResponse()
  }
}

export const ExitHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'IntentRequest' && (request.intent.name === 'AMAZON.CancelIntent' || request.intent.name === 'AMAZON.StopIntent')
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(EXIT_MESSAGE)
      .getResponse()
  }
}

export const SessionEndedRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'SessionEndedRequest'
  },
  handle(handlerInput) {
    console.log('The session ended');
    console.log(`${JSON.stringify(handlerInput)}`)
    return handlerInput.responseBuilder.getResponse()
  }
}

export const ErrorHandler: Alexa.ErrorHandler = {
  canHandle() {
    return true
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`)

    return handlerInput.responseBuilder
      .speak('何を言っているのか理解できませんでした')
      .reprompt('何を言っているのか理解できませんでした')
      .getResponse();
  }
}

interface IEntry {
  title: string
  content: string
  publishedAt: string
}

const getNewestEntry = async (): Promise<IEntry> => {
  const docClient = new AWS.DynamoDB.DocumentClient(AWS_CONFIG)
  const params = {
    TableName: 'Entries',
    ExpressionAttributeNames: {
      '#t': 'type',
      '#p': 'publishedAt'
    },
    ExpressionAttributeValues: {
      ':t': 'Dream',
      ':p': '2017-09-05T0:00:00.000Z'
    },
    KeyConditionExpression: '#t = :t and #p > :p',
    Limit: 1,
    ScanIndexForward: false
  }

  const res = await docClient.query(params).promise()
  return EntryConverter(res.Items[0])
}

const getAllEntry = async (): Promise<IEntry[]> => {
  const docClient = new AWS.DynamoDB.DocumentClient(AWS_CONFIG)
  const params = {
    TableName: 'Entries'
  }
  const res = await docClient.scan(params).promise()
  return res.Items.map(EntryConverter)
}

const postEntry = async (content: string): Promise<boolean> => {
  const client = axios.create({
    baseURL: 'https://blog.hatena.ne.jp/alice345/alitaso345.hatenadiary.jp/atom/entry',
    auth: {
      username: process.env['HATENA_ID'],
      password: process.env['HATENA_API_KEY']
    }
  })
  const body = `<?xml version="1.0" encoding="utf-8"?><entry xmlns="http://www.w3.org/2005/Atom" xmlns:app="http://www.w3.org/2007/app"><title>夢みた</title><content type="text/plain">${content}</content><category term="夢日記" /></entry>`
  return client.request({ method: 'POST', data: body })
    .then(() => { return true })
    .catch(() => { return false })
}

interface IDocument {
  description?: string
  import?: object
  mainTemplate: ILayout
  type: string
  version: string
}

interface ILayout {
  parameters: string[]
  items: object[]
  description?: string
}

const buildAplDocument = (): IDocument => {
  const document = {
    type: "APL",
    version: "1.0",
    theme: "dark",
    import: {
      name: "alexa-layouts",
      version: "1.0.0"
    },
    resources: [],
    styles: [],
    mainTemplate: {
      parameters: [
        "payload"
      ],
      items: [
        {
          when: "${viewport.shape == 'round'}",
          type: "Container",
          direction: "column",
          width: "100vw",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          items: [
            {
              "type": "Pager",
              "id": "EntryPager",
              "width": "70vw",
              "height": "70vh",
              "data": "${payload.data.properties.entries}",
              "item": [
                {
                  "type": "Container",
                  "width": "100vw",
                  "height": "100vh",
                  "item": [
                    {
                      "type": "Text",
                      "id": "${data.publishedAt}",
                      "text": "${data.content}",
                      "speech": "${data.speech}"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          when: "${viewport.shape == 'rectangle'}",
          type: "Container",
          direction: "column",
          width: "100vw",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          items: [
            {
              "type": "Pager",
              "id": "EntryPager",
              "width": "100vw",
              "height": "100vh",
              "data": "${payload.data.properties.entries}",
              "item": [
                {
                  "type": "Container",
                  "width": "100vw",
                  "height": "100vh",
                  "item": [
                    {
                      "type": "Text",
                      "id": "${data.publishedAt}",
                      "text": "${data.content}",
                      "speech": "${data.speech}"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  }

  return document
}

interface IDatasourceWraper {
  data: IDatasource
}

interface IDatasource {
  type: string // "object"である必要がある https://developer.amazon.com/ja/docs/alexa-presentation-language/apl-data-source.html#object-type-data-sources
  properties?: object
  objectId?: string
  description?: string
  transformers?: ITransformer[]
}

interface ITransformer {
  inputPath: string
  outputName?: string
  transformer: string
}

const buildDataSources = (entries: IEntry[]): IDatasourceWraper => {
  const datasources: IDatasourceWraper = {
    data: {
      type: "object",
      objectId: "happy-system",
      properties: {},
      transformers: []
    }
  }

  datasources.data.properties = { entries: entries }
  datasources.data.transformers.push(
    {
      inputPath: 'entries[*].content',
      outputName: 'speech',
      transformer: 'ssmlToSpeech'
    }
  )

  return datasources
}

const buildCommands = (entries: IEntry[]): interfaces.alexa.presentation.apl.Command[] => {
  const commands = []
  entries.forEach(entry => {
    // 日記の音読とページ送りを繰り返す
    commands.push(
      {
        type: 'SpeakItem',
        componentId: entry.publishedAt
      },
      {
        type: "SetPage",
        componentId: "EntryPager",
        position: "relative",
        value: 1
      }
    )
  })

  return commands
}

const supportDisplay = (handlerInput: Alexa.HandlerInput): interfaces.display.DisplayInterface => {
  const hasDisplay =
    handlerInput.requestEnvelope &&
    handlerInput.requestEnvelope.context &&
    handlerInput.requestEnvelope.context.System &&
    handlerInput.requestEnvelope.context.System.device &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display

  return hasDisplay
}

const EntryConverter = (res): IEntry => ({
  title: res.title,
  content: res.content,
  publishedAt: res.publishedAt
})

function shuffle<T>(array: T[]): T[] {
  if (array.length <= 1) return array

  for (let i = array.length - 1; i > 0; i--) {
    const randomChoiceIndex = Math.floor(Math.random() * (i + 1))
    const tmp = array[i]
    array[i] = array[randomChoiceIndex]
    array[randomChoiceIndex] = tmp
  }

  return array
}