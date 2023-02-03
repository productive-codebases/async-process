import { setupLogger } from '@productive-codebases/toolbox'

const loggerMapping = {
  AsyncProcess: {
    functionsRegistrations: 'functionsRegistrations',
    functionsExecutions: 'functionsExecutions'
  }
}

const { newLogger, debug } = setupLogger(loggerMapping)

const logger = newLogger('AsyncProcess')

export { logger, debug }

export type LoggerNamespace = Parameters<typeof logger>[0]
export type Logger = typeof logger
