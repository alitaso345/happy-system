import * as Alexa from 'ask-sdk-core'
import {
  LaunchRequestHandler,
  RecordRequestHandler,
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
    RecordRequestHandler,
    NewestDreamRequestHandler,
    RepeatRequestHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda()

