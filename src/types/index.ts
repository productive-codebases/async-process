import { Maybe } from '@productive-codebases/toolbox'
import { AsyncProcess } from '../AsyncProcess'

export type Fn = () => any
export type AsyncFn = () => Promise<any>
export type FnOrAsyncFn = Fn | AsyncFn
export type Jobs = FnOrAsyncFn | Array<FnOrAsyncFn>

export type ErrorFn = (err: Error) => any
export type AsyncErrorFn = (err: Error) => Promise<any>
export type FnOrAsyncErrorFn = ErrorFn | AsyncErrorFn
export type AsyncErrorFns = FnOrAsyncErrorFn | Array<FnOrAsyncErrorFn>

export type PredicateFn<TIdentifier extends string> = (
  asyncProcess: AsyncProcess<TIdentifier>
) => boolean | Promise<boolean>

export interface IAsyncProcessFns {
  jobs: Map<string, Set<AsyncFn>>
  onStartFns: Map<string, Set<AsyncFn>>
  onSuccessFns: Map<string, Set<AsyncFn>>
  onErrorFns: Map<string, Set<AsyncErrorFn>>
}

export type AsyncProcessIdentifiers<TIdentifier extends string> = [
  TIdentifier,
  Maybe<string>
]

export interface IAsyncProcessOptions {
  // delete registered functions when async process is started
  deleteFunctionsWhenStarted: boolean
}
