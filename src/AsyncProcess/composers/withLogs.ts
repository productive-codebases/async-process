import { MetaData } from 'crock-toolbox'
import { AsyncProcess } from '..'

interface IWithLogsMetadata {
  withLogs: {
    initialized: boolean
  }
}

/**
 * Log states of an async process.
 */
export function withLogs<TIdentifier extends string>(
  logger: (message: string, ...args: any[]) => void
) {
  return (
    asyncProcess: AsyncProcess<TIdentifier>
  ): AsyncProcess<TIdentifier> => {
    const metadata = asyncProcess.metadata as MetaData<IWithLogsMetadata>
    const composerMetadata = metadata.get('withLogs')

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
      'withLogs'
    ])
      .onStart(() => {
        logger('Start %s', asyncProcess.identifier)
      })
      .onSuccess(() => {
        logger('Success %s', asyncProcess.identifier)
      })
      .onError(err => {
        logger('Error %s: %o', asyncProcess.identifier, err)
      })
  }
}
