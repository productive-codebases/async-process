import { setupLogger } from '@productive-codebases/toolbox'

const loggerMapping = {
  asyncprocess: {
    runtime: 'runtime'
  }
}

const { newLogger, debug } = setupLogger(loggerMapping)

export const logger = newLogger('asyncprocess')('runtime')
export { debug }

export type Logger = typeof logger
