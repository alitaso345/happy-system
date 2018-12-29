import * as AWS from 'aws-sdk'
import * as Alexa from 'ask-sdk-core'
import { interfaces } from 'ask-sdk-model';

const AWS_CONFIG = { region: 'ap-northeast-1' }
const HELP_MESSAGE = '最新の夢日記をおしえて、と聞いてみてください。最新の内容を取得することができます。'
const HELP_REPROMPT = 'ご用件はなんでしょうか？'
const EXIT_MESSAGE = '<say-as interpret-as="interjection">おやすみなさい。良い夢を。</say-as>'

export const LaunchRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'LaunchRequest'
  },
  async handle(handlerInput) {
    const newestEntry = await getNewestEntry()
    const datasources = buildDataSources(newestEntry)
    const document = buildAplDocument()
    const command: interfaces.alexa.presentation.apl.SpeakItemCommand = {
      type: 'SpeakItem',
      componentId: 'dreamTextComponent'
    }

    if (!supportDisplay(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(newestEntry)
        .getResponse()
    }

    return handlerInput.responseBuilder
      .addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: 'happy',
        document: document,
        datasources: datasources
      })
      .addDirective({
        type: 'Alexa.Presentation.APL.ExecuteCommands',
        token: 'happy',
        commands: [command]
      })
      .withShouldEndSession(true)
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
    const datasources = buildDataSources(newestEntry)
    const document = buildAplDocument()
    const command: interfaces.alexa.presentation.apl.SpeakItemCommand = {
      type: 'SpeakItem',
      componentId: 'dreamTextComponent'
    }

    if (!supportDisplay(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(newestEntry)
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
    const entries = await getAllEntry()
    const datasources = buildDataSources(entries)
    const document = buildAplDocument()
    return handlerInput.responseBuilder
      .speak('test')
      .getResponse()
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
  publishedAt: Date
}

const getNewestEntry = (): Promise<string> => {
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

  return new Promise(resolve => {
    docClient.query(params, (err, data) => {
      if (err) {
        console.log("ERROR:", JSON.stringify(err))
      } else {
        resolve(data.Items[0].content)
      }
    })
  })
}

const getAllEntry = async (): Promise<IEntry[]> => {
  const docClient = new AWS.DynamoDB.DocumentClient(AWS_CONFIG)
  const params = {
    TableName: 'Entries'
  }
  const res = await docClient.scan(params).promise()
  return res.Items.map(EntryConverter)
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
              type: "ScrollView",
              width: "70vw",
              height: "70vh",
              item: {
                type: "Text",
                id: "dreamTextComponent",
                text: "${payload.data.properties.dreamContent}",
                speech: "${payload.data.properties.dreamContentSpeech}"
              }
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
              type: "ScrollView",
              width: "100vw",
              height: "100vh",
              item: {
                type: "Text",
                id: "dreamTextComponent",
                text: "${payload.data.properties.dreamContent}",
                speech: "${payload.data.properties.dreamContentSpeech}"
              }
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
  entry?: string
  objectId?: string
  description?: string
  transformers?: ITransformer[]
}

interface ITransformer {
  inputPath: string
  outputName?: string
  transformer: string
}

const buildDataSources = (entry: string): IDatasourceWraper => {
  const datasources: IDatasourceWraper = {
    data: {
      type: "object",
      objectId: "happy-system",
      entry: "",
      properties: {},
      transformers: []
    }
  }

  const inputPath = 'dreamSsml'
  datasources.data.entry = entry
  datasources.data.properties[inputPath] = `<speak>${entry}</speak>`
  datasources.data.transformers.push(
    {
      inputPath: inputPath,
      outputName: 'dreamContentSpeech',
      transformer: 'ssmlToSpeech'
    },
    {
      inputPath: inputPath,
      outputName: 'dreamContent',
      transformer: 'ssmlToText'
    }
  )

  return datasources
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
  publishedAt: new Date(res.publishedAt)
})