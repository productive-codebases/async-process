import { setupLogger } from 'crock-toolbox'

const loggerMapping = {
  asyncprocess: {
    main: 'main'
  }
}

const { newLogger, debug } = setupLogger(loggerMapping)

export const logger = newLogger('asyncprocess')('main')
export { debug }

export type Logger = typeof logger
