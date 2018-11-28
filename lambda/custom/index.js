const Alexa = require('ask-sdk-core')
const axios = require('axios')
const parser = require('xml2json')

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'LaunchRequest'
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('夢日記へようこそ')
      .getResponse()
  }
}

const NewestDreamRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'IntentRequest' && request.intent.name === 'NewestDreamIntent'
  },
  async handle(handlerInput) {
    const client = axios.create({
      baseURL: 'https://blog.hatena.ne.jp/alice345/alitaso345.hatenadiary.jp/atom'
    })

    const dialyContent = await client.request({
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

    return handlerInput.responseBuilder
      .speak(dialyContent)
      .getResponse()
  }
}

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent'
  },
  handle(handlerInput){
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_REPROMPT)
      .getResponse()
  }
}

const HELP_MESSAGE = '最新の夢日記をおしえて、と聞いてみてください。最新の内容を取得することができます。'
const HELP_REPROMPT = 'ご用件はなんでしょうか？'

const skillBuilder = Alexa.SkillBuilders.custom()

exports.handler = skillBuilder
  .addRequestHandlers(LaunchRequestHandler, NewestDreamRequestHandler, HelpHandler)
  .lambda()