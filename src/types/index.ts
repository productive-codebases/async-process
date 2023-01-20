import { Maybe } from '@productive-codebases/toolbox'
import { AsyncProcess } from '../AsyncProcess'

export type Fn<R> = () => R
export type AsyncFn<R> = () => Promise<R>
export type FnOrAsyncFn<R> = Fn<R> | AsyncFn<R>
export type Jobs<R> = FnOrAsyncFn<R> | Array<FnOrAsyncFn<R>>

export type ErrorFn = (err: unknown) => any
export type AsyncErrorFn = (err: unknown) => Promise<any>
export type FnOrAsyncErrorFn = ErrorFn | AsyncErrorFn
export type AsyncErrorFns = FnOrAsyncErrorFn | Array<FnOrAsyncErrorFn>

export type PredicateFn<TIdentifier extends string> = (
  asyncProcess: AsyncProcess<TIdentifier>
) => boolean | Promise<boolean>

export type PredicateFns<TIdentifier extends string> =
  | PredicateFn<TIdentifier>
  | Array<PredicateFn<TIdentifier>>

export interface IAsyncProcessFns<R> {
  jobs: Map<string, Set<FnOrAsyncFn<R>>>
  onStartFns: Map<string, Set<FnOrAsyncFn<R>>>
  onSuccessFns: Map<string, Set<FnOrAsyncFn<R>>>
  onErrorFns: Map<string, Set<FnOrAsyncErrorFn>>
  predicateFns: Map<string, Set<PredicateFn<any>>>
}

export type AsyncProcessIdentifiers<TIdentifier extends string> = [
  TIdentifier,
  Maybe<string>
]

export interface IAsyncProcessOptions {
  // delete registered functions when async process is started
  deleteFunctionsWhenJobsStarted: boolean
  debug: {
    logFunctionRegistrations: boolean
    logFunctionExecutions: boolean
  }
}
