import * as Alexa from 'ask-sdk-core'
import {
  LaunchRequestHandler,
  NewestDreamRequestHandler,
  HelpHandler,
  ExitHandler,
  SessionEndedRequestHandler,
  ErrorHandler
} from './handlers'

const skillBuilder = Alexa.SkillBuilders.custom()

export const handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    NewestDreamRequestHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda()

