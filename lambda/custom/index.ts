import * as Alexa from 'ask-sdk-core'
import {
  LaunchRequestHandler,
  NewestDreamRequestHandler,
  RepeatRequestHandler,
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
    RepeatRequestHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda()

