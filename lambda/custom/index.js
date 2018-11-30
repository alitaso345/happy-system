const Alexa = require('ask-sdk-core')
const axios = require('axios')
const parser = require('xml2json')

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'LaunchRequest'
  },
  async handle(handlerInput) {
    const newestEntry = await getNewestEntry()
    return handlerInput.responseBuilder
      .speak(newestEntry)
      .getResponse()
  }
}

const NewestDreamRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'IntentRequest' && request.intent.name === 'NewestDreamIntent'
  },
  async handle(handlerInput) {
    const newestEntry = await getNewestEntry()
    return handlerInput.responseBuilder
      .speak(newestEntry)
      .getResponse()
  }
}

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent'
  },
  handle(handlerInput){
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_REPROMPT)
      .getResponse()
  }
}

const ExitHandler = {
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

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'SessionEndedRequest'
  },
  handle(handlerInput) {
    console.log(`The session ended: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse()
  }
}

const ErrorHandler = {
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

const HELP_MESSAGE = '最新の夢日記をおしえて、と聞いてみてください。最新の内容を取得することができます。'
const HELP_REPROMPT = 'ご用件はなんでしょうか？'
const EXIT_MESSAGE = '<say-as interpret-as="interjection">おやすみなさい。良い夢を。</say-as>'

const skillBuilder = Alexa.SkillBuilders.custom()

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    NewestDreamRequestHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda()

async function getNewestEntry() {
  const client = axios.create({
    baseURL: 'https://blog.hatena.ne.jp/alice345/alitaso345.hatenadiary.jp/atom'
  })

  const content = await client.request({
    method: 'get',
    url: '/entry',
    auth: {
      username: process.env['HATENA_ID'],
      password: process.env['HATENA_API_KEY']
    }
  }).then(res => {
    const json = JSON.parse(parser.toJson(res.data))
    const latestEntry = json.feed.entry[0]
    const content = latestEntry.content["$t"]
    return content
  })

  return content
}