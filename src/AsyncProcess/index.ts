import { ensureArray, Maybe, MetaData } from '@productive-codebases/toolbox'
import {
  AsyncErrorFn,
  AsyncErrorFns,
  AsyncFn,
  AsyncFns,
  AsyncProcessIdentifiers,
  IAsyncProcessFns,
  IAsyncProcessOptions,
  PredicateFn
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
    deleteFunctionsWhenStarted: false
  }

  private _error: Maybe<Error> = null

  private _fns: IAsyncProcessFns = {
    asyncFns: new Map(),
    onStartFns: new Map(),
    onSuccessFns: new Map(),
    onErrorFns: new Map()
  }

  private _predicateFns: Set<PredicateFn<TIdentifier>> = new Set()

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
  setOptions(options: IAsyncProcessOptions): this {
    this._options = options
    return this
  }

  /**
   * Save the async process function(s).
   */
  do(asyncFns: AsyncFns, identifier = 'do'): this {
    this._fns.asyncFns.set(identifier, new Set(ensureArray(asyncFns)))
    return this
  }

  /**
   * Save a predicate function to trigger or not the process.
   */
  if(predicateFn: PredicateFn<TIdentifier>): this {
    this._predicateFns.add(predicateFn)
    return this
  }

  /**
   * Save functions to execute before starting the async process.
   */
  onStart(asyncFns: AsyncFns, identifier = 'onStart'): this {
    this._fns.onStartFns.set(identifier, new Set(ensureArray(asyncFns)))
    return this
  }

  /**
   * Save functions to execute after the async process if succeeded.
   */
  onSuccess(asyncFns: AsyncFns, identifier = 'onSuccess'): this {
    this._fns.onSuccessFns.set(identifier, new Set(ensureArray(asyncFns)))
    return this
  }

  /**
   * Save functions to execute after the async process if failed.
   */
  onError(asyncFns: AsyncErrorFns, identifier = 'onError'): this {
    this._fns.onErrorFns.set(identifier, new Set(ensureArray(asyncFns)))
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

    asyncProcessFns.asyncFns.forEach((fns, identifier) => {
      this._fns.asyncFns.set(identifier, fns)
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
   * Start the async process and executes registered functions.
   */
  async start(): Promise<this> {
    this._error = null

    try {
      if (this._predicateFns && !(await this.shouldStart())) {
        await this._execAsyncFns(this._fns.onSuccessFns)

        this.shouldResetFunctions()

        return this
      }

      await this._execAsyncFns(this._fns.onStartFns)
      await this._execAsyncFns(this._fns.asyncFns)
      await this._execAsyncFns(this._fns.onSuccessFns)

      this.shouldResetFunctions()
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
    for (const predicateFn of this._predicateFns) {
      if (!(await predicateFn(this))) {
        return false
      }
    }
    return true
  }

  /**
   * Reset functions.
   */
  shouldResetFunctions(): this {
    if (!this._options.deleteFunctionsWhenStarted) {
      return this
    }

    this._fns = {
      asyncFns: new Map(),
      onStartFns: new Map(),
      onSuccessFns: new Map(),
      onErrorFns: new Map()
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
  private _execAsyncFns(asyncFns: Map<string, Set<AsyncFn>>): Promise<this> {
    return Array.from(asyncFns.values())
      .reduce<AsyncFn[]>(
        (acc, fns_) => acc.concat(Array.from(fns_.values())),
        []
      )
      .reduce(
        (promise, nextFn) => promise.then(() => nextFn()),
        Promise.resolve(null)
      )
      .then(() => this)
  }

  /**
   * Execute sequentially async error functions.
   */
  private _execAsyncErrorFns(
    err: Error,
    asyncErrorFns: Map<string, Set<AsyncErrorFn>>
  ): Promise<this> {
    return Array.from(asyncErrorFns.values())
      .reduce<AsyncErrorFn[]>(
        (acc, fns_) => acc.concat(Array.from(fns_.values())),
        []
      )
      .reduce(
        (promise, nextFn) => promise.then(() => nextFn(err)),
        Promise.resolve(null)
      )
      .then(() => this)
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
    return [identifier, subIdentifiers ? subIdentifiers.join('/') : null]
  }
}
