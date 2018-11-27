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

const DreamRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request
    return request.type === 'IntentRequest' && request.intent.name === 'DreamIntent'
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
      const latestEntry = json.feed.entry[1]
      const content = latestEntry.content["$t"]
      return content
    })

    return handlerInput.responseBuilder
      .speak(dialyContent)
      .getResponse()
  }
}

const skillBuilder = Alexa.SkillBuilders.custom()

exports.handler = skillBuilder
  .addRequestHandlers(LaunchRequestHandler, DreamRequestHandler)
  .lambda()