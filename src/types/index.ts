import { Maybe } from '@productive-codebases/toolbox'
import { AsyncProcess } from '../AsyncProcess'

export type Fn<R> = () => R
export type AsyncFn<R> = () => Promise<R>
export type FnOrAsyncFn<R> = Fn<R> | AsyncFn<R>
export type Jobs<R> = FnOrAsyncFn<R> | Array<FnOrAsyncFn<R>>

export type ErrorFn<E> = (err: E) => any
export type AsyncErrorFn<E> = (err: E) => Promise<any>
export type FnOrAsyncErrorFn<E> = ErrorFn<E> | AsyncErrorFn<E>
export type AsyncErrorFns<E> = FnOrAsyncErrorFn<E> | Array<FnOrAsyncErrorFn<E>>

export type PredicateFn<TIdentifier extends string> = (
  asyncProcess: AsyncProcess<TIdentifier>
) => boolean | Promise<boolean>

export type PredicateFns<TIdentifier extends string> =
  | PredicateFn<TIdentifier>
  | Array<PredicateFn<TIdentifier>>

export interface IAsyncProcessFns<R, E> {
  jobs: Map<string, Set<FnOrAsyncFn<R>>>
  onStartFns: Map<string, Set<FnOrAsyncFn<R>>>
  onSuccessFns: Map<string, Set<FnOrAsyncFn<R>>>
  onErrorFns: Map<string, Set<FnOrAsyncErrorFn<E>>>
  predicateFns: Map<string, Set<PredicateFn<any>>>
}

export type AsyncProcessIdentifiers<TIdentifier extends string> = [
  TIdentifier,
  Maybe<string>
]

export interface IAsyncProcessOptions {
  // delete registered functions when async process is started
  deleteFunctionsWhenJobsStarted: boolean
}
