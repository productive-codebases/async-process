import { ensureArray, Maybe, MetaData } from '@productive-codebases/toolbox'
import { LoggerLevel } from '@productive-codebases/toolbox/dist/types/libs/logger/types'
import { logger, LoggerNamespace } from '../logger'
import {
  AsyncErrorFn,
  AsyncErrorFns,
  AsyncFn,
  AsyncProcessIdentifiers,
  IAsyncProcessFns,
  IAsyncProcessOptions,
  Jobs,
  PredicateFns
} from '../types'

/**
 * Used to execute an async process (generally a call to an external service)
 * and executes functions according to the successes / errors.
 */

export class AsyncProcess<TIdentifier extends string> {
  public metadata = new MetaData()

  private _identifiers: AsyncProcessIdentifiers<TIdentifier>

  private _options: IAsyncProcessOptions = {
    /**
     * When set to true, registered functions are deleted after AsyncProcess has been started.
     * Useful when reusing a same instance of AsyncProcess to not have functions registered several times.
     */
    deleteFunctionsWhenJobsStarted: false,
    debug: {
      logFunctionRegistrations: false,
      logFunctionExecutions: false
    }
  }

  private _error: Maybe<Error> = null

  private _fns: IAsyncProcessFns = {
    jobs: new Map(),
    onStartFns: new Map(),
    onSuccessFns: new Map(),
    onErrorFns: new Map(),
    predicateFns: new Map()
  }

  /**
   * Static
   */

  private static _instances: Map<
    // key is AsyncProcessIdentifiers stringified
    string,
    AsyncProcess<any>
  > = new Map()

  /**
   * Singleton to be able to retrieve the same instance of AsyncProcess according*
   * to its identifier.
   *
   * Usage:
   * const asyncProcess = AsyncProcess.instance(...)
   */
  private constructor(
    identifier: TIdentifier,
    subIdentifiers?: Maybe<string[]>
  ) {
    this._identifiers = AsyncProcess.computeIdentifiers(
      identifier,
      subIdentifiers
    )
  }

  /**
   * Set AsyncProcess options.
   */
  setOptions(options: Partial<IAsyncProcessOptions>): this {
    this._options = { ...this._options, ...options }
    return this
  }

  /**
   * Save jobs function(s).
   */
  do(jobs: Jobs, identifier = 'defaultJobs'): this {
    this._log('functionsRegistrations')('debug')(
      `Register "${identifier}" jobs function(s)`
    )

    this._fns.jobs.set(identifier, new Set(ensureArray(jobs)))
    return this
  }

  /**
   * Save a predicate function to trigger or not the process.
   */
  if(
    predicateFns: PredicateFns<TIdentifier>,
    identifier = 'defaultPredicate'
  ): this {
    this._fns.predicateFns.set(identifier, new Set(ensureArray(predicateFns)))
    return this
  }

  /**
   * Save functions to execute before starting jobs.
   */
  onStart(jobs: Jobs, identifier = 'defaultOnStart'): this {
    this._log('functionsRegistrations')('debug')(
      `Register "${identifier}" onStart function(s)`
    )

    this._fns.onStartFns.set(identifier, new Set(ensureArray(jobs)))
    return this
  }

  /**
   * Save functions to execute after jobs are succesful.
   */
  onSuccess(jobs: Jobs, identifier = 'defaultOnSuccess'): this {
    this._log('functionsRegistrations')('debug')(
      `Register "${identifier}" onSuccess function(s)`
    )

    this._fns.onSuccessFns.set(identifier, new Set(ensureArray(jobs)))
    return this
  }

  /**
   * Save functions to execute after jobs are succesful.
   */
  onError(jobs: AsyncErrorFns, identifier = 'defaultOnError'): this {
    this._log('functionsRegistrations')('debug')(
      `Register "${identifier}" onError function(s)`
    )

    this._fns.onErrorFns.set(identifier, new Set(ensureArray(jobs)))
    return this
  }

  /**
   * Add functions from an another AsyncProcess instance.
   */
  compose(
    asyncProcessComposer: (
      asyncProcess: AsyncProcess<TIdentifier>
    ) => AsyncProcess<TIdentifier>
  ): this {
    const asyncProcessFns = asyncProcessComposer(this).fns

    asyncProcessFns.jobs.forEach((fns, identifier) => {
      this._fns.jobs.set(identifier, fns)
    })

    asyncProcessFns.onStartFns.forEach((fns, identifier) => {
      this._fns.onStartFns.set(identifier, fns)
    })

    asyncProcessFns.onSuccessFns.forEach((fns, identifier) => {
      this._fns.onSuccessFns.set(identifier, fns)
    })

    asyncProcessFns.onErrorFns.forEach((fns, identifier) => {
      this._fns.onErrorFns.set(identifier, fns)
    })

    return this
  }

  /**
   * Return the main identifier of the instance.
   */
  get identifier(): TIdentifier {
    return this._identifiers[0]
  }

  /**
   * Return all identifiers + identifier + subIdentifiers of the instance.
   */
  get identitiers(): AsyncProcessIdentifiers<TIdentifier> {
    return this._identifiers
  }

  /**
   * Return all identifiers as a string.
   */
  get identitiersAsString(): string {
    return this._identifiers.filter(Boolean).join('/')
  }

  /**
   * Start jobs and executes registered functions.
   */
  async start(): Promise<this> {
    this._error = null

    try {
      if (this._fns.predicateFns.size && !(await this.shouldStart())) {
        await this._execJobs(this._fns.onSuccessFns)

        this.shouldDeleteFunctions()

        return this
      }

      await this._execJobs(this._fns.onStartFns)
      await this._execJobs(this._fns.jobs)
      await this._execJobs(this._fns.onSuccessFns)

      this.shouldDeleteFunctions()
    } catch (err) {
      this._error = err instanceof Error ? err : new Error('Unknown error')
      this._execAsyncErrorFns(this._error, this._fns.onErrorFns)
    }

    return this
  }

  /**
   * Return a boolean according to registered predicates values.
   */
  async shouldStart(): Promise<boolean> {
    for (const [identifier, predicateFns] of this._fns.predicateFns.entries()) {
      for (const predicateFn of predicateFns) {
        if (!(await predicateFn(this))) {
          this._log('functionsExecutions')('debug')(
            `Skip jobs execution because of the "${identifier}" predicate`
          )

          return false
        }
      }
    }

    return true
  }

  /**
   * Delete functions.
   */
  shouldDeleteFunctions(): this {
    if (!this._options.deleteFunctionsWhenJobsStarted) {
      return this
    }

    this._log('functionsRegistrations')('debug')(
      `Delete functions after starting jobs`
    )

    this._fns = {
      jobs: new Map(),
      onStartFns: new Map(),
      onSuccessFns: new Map(),
      onErrorFns: new Map(),
      predicateFns: new Map()
    }

    return this
  }

  /**
   * Getters
   */

  get fns(): IAsyncProcessFns {
    return this._fns
  }

  get error(): Maybe<Error> {
    return this._error
  }

  /**
   * Private
   */

  /**
   * Execute sequentially async functions.
   */
  private async _execJobs(jobs: Map<string, Set<AsyncFn>>): Promise<this> {
    for (const [identifier, fns] of jobs.entries()) {
      for (const fn of fns) {
        this._log('functionsExecutions')('debug')(
          `Execute "${identifier}" jobs function(s)`
        )

        await fn()
      }
    }

    return this
  }

  /**
   * Execute sequentially async error functions.
   */
  private async _execAsyncErrorFns(
    err: Error,
    asyncErrorFns: Map<string, Set<AsyncErrorFn>>
  ): Promise<this> {
    for (const [identifier, fns] of asyncErrorFns.entries()) {
      for (const fn of fns) {
        this._log('functionsExecutions')('debug')(
          `Execute "${identifier}" onError function(s)`
        )

        await fn(err)
      }
    }

    return this
  }

  /**
   * Log with AsyncProcess identifier prefix.
   */
  private _log(namespace: LoggerNamespace) {
    return (level: LoggerLevel) => (message: string) => {
      logger(namespace)(level)(`[${this.identitiersAsString}] ${message}`)
    }
  }

  /**
   * Static
   */

  static instance<TIdentifier extends string>(
    identifier: TIdentifier,
    subIdentifiers?: Maybe<string[]>
  ): AsyncProcess<TIdentifier> {
    const identifiersAsString = AsyncProcess.computeIdentifiers(
      identifier,
      subIdentifiers ?? null
    ).join('/')

    const instance = AsyncProcess._instances.get(identifiersAsString)

    if (instance) {
      return instance
    }

    const asyncProcess = new AsyncProcess(identifier, subIdentifiers)
    AsyncProcess._instances.set(identifiersAsString, asyncProcess)

    return asyncProcess as AsyncProcess<TIdentifier>
  }

  /**
   * Clear all instances.
   */
  static clearInstances(): void {
    AsyncProcess._instances.clear()
  }

  /**
   * Compute the internal identifiers.
   */
  static computeIdentifiers<TIdentifier extends string>(
    identifier: TIdentifier,
    subIdentifiers?: Maybe<string[]>
  ): AsyncProcessIdentifiers<TIdentifier> {
    return [
      identifier,
      subIdentifiers ? subIdentifiers.filter(Boolean).join('/') : null
    ]
  }
}
