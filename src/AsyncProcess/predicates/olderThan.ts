import { AsyncProcess } from '..'
import { Maybe, MetaData } from '@productive-codebases/toolbox'

/**
 * Return a predicate function to trigger async functions
 * according to a delay passed in seconds.
 *
 * Usage:
 *
 * AsyncProcess.instance(...)
 *   .do(() => fn)
 *   # Don't call `fn` during 10 seconds
 *   .if(olderThan(10))
 *   ...
 *
 * To expire process (and force to call then again the next time):
 *
 * AsyncProcess.instance(...).metadata.get('expireProcess')()
 */
interface IOlderDataMetadata {
  olderThan: {
    lastDate: number
    cancelDelay: () => void
  }
}

export function olderThan<TIdentifier extends string>(seconds: number) {
  return (asyncProcess: AsyncProcess<TIdentifier>): boolean => {
    const metadata = asyncProcess.metadata as MetaData<IOlderDataMetadata>
    const predicateMetadata = metadata.get('olderThan')

    if (!predicateMetadata) {
      const newLastDate = new Date().getTime()

      metadata.set({
        olderThan: {
          lastDate: newLastDate,
          // when calling expireProcess(), delete lastData to set a new lastDate the next time
          cancelDelay: () => metadata.delete('olderThan')
        }
      })

      // load data when setting lastDate for the first time
      return true
    }

    const currentDate = new Date().getTime()
    const delta = currentDate / 1000 - predicateMetadata.lastDate / 1000
    const isDataExpired = delta > seconds

    if (isDataExpired) {
      metadata.set({
        olderThan: {
          ...predicateMetadata,
          lastDate: currentDate
        }
      })
    }

    return isDataExpired
  }
}

/**
 * Shortcut to cancel the delay of the olderThan predicate.
 *
 * Usage:
 *
 * cancelOlderThanDelay('asyncProcessIdentifier')
 */
export function cancelOlderThanDelay<TIdentifier extends string>(
  identifier: TIdentifier,
  subIdentifiers?: Maybe<string[]>
): void {
  const predicateMetadata = AsyncProcess.instance(identifier, subIdentifiers)
    .metadata as MetaData<IOlderDataMetadata>

  const cancelDelayFn = predicateMetadata.get('olderThan')?.cancelDelay

  if (cancelDelayFn) {
    cancelDelayFn()
  }
}
