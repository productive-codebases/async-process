import { MetaData } from '@productive-codebases/toolbox'
import { AsyncProcess } from '..'

interface IWithLogsMetadata {
  [identifier: string]: {
    initialized: boolean
  }
}

/**
 * Log states of an async process.
 */
export function withLogs<TIdentifier extends string>(
  logger: (message: string, ...args: any[]) => void,
  identifier = 'withLogs'
) {
  return (
    asyncProcess: AsyncProcess<TIdentifier>
  ): AsyncProcess<TIdentifier> => {
    const metadata = asyncProcess.metadata as MetaData<IWithLogsMetadata>
    const composerMetadata = metadata.get(identifier)

    // avoid register again if already done
    if (composerMetadata?.initialized) {
      return asyncProcess
    }

    metadata.set({
      withLogs: {
        initialized: true
      }
    })

    return AsyncProcess.instance<TIdentifier>(asyncProcess.identifier, [
      identifier
    ])
      .onStart(() => {
        logger('Start %s', asyncProcess.identifier)
      }, identifier)
      .onSuccess(() => {
        logger('Success %s', asyncProcess.identifier)
      }, identifier)
      .onError(err => {
        logger('Error %s: %o', asyncProcess.identifier, err)
      }, identifier)
  }
}
