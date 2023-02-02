import { AsyncProcess } from '..'
import { Maybe, MetaData } from '@productive-codebases/toolbox'
import { PredicateFn } from '../../types'

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
interface IOlderThanDataMetadata {
  olderThan: {
    lastDate: number
    cancelDelay: () => void
    dependencies: OlderThanDependency[]
  }
}

type OlderThanDependency = boolean | string | number

export function olderThan<TIdentifier extends string>(
  seconds: number,
  dependencies: OlderThanDependency[] = []
): PredicateFn<TIdentifier> {
  function hasDependenciesChanged(previousDependancies: OlderThanDependency[]) {
    for (let index = 0; index <= dependencies.length; index++) {
      if (previousDependancies[index] !== dependencies[index]) {
        return true
      }
    }

    return false
  }

  /**
   * Predicate function.
   */
  return asyncProcess => {
    const metadata = asyncProcess.metadata as MetaData<IOlderThanDataMetadata>
    const predicateMetadata = metadata.get('olderThan')

    if (!predicateMetadata) {
      const newLastDate = new Date().getTime()

      metadata.set({
        olderThan: {
          lastDate: newLastDate,
          // when calling expireProcess(), delete lastData to set a new lastDate the next time
          cancelDelay: () => metadata.delete('olderThan'),
          dependencies
        }
      })

      // load data when setting lastDate for the first time
      return true
    }

    // if dependencies has changed, load data
    if (hasDependenciesChanged(predicateMetadata.dependencies)) {
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

    // if data is expired, load data
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
    .metadata as MetaData<IOlderThanDataMetadata>

  const cancelDelayFn = predicateMetadata.get('olderThan')?.cancelDelay

  if (cancelDelayFn) {
    cancelDelayFn()
  }
}
