import { Maybe } from 'crock-toolbox'
import { AsyncProcess } from '../AsyncProcess'

export type Fn = () => any
export type AsyncFn = () => Promise<any>
export type FnOrAsyncFn = Fn | AsyncFn
export type AsyncFns = FnOrAsyncFn | Array<FnOrAsyncFn>

export type ErrorFn = (err: Error) => any
export type AsyncErrorFn = (err: Error) => Promise<any>
export type FnOrAsyncErrorFn = ErrorFn | AsyncErrorFn
export type AsyncErrorFns = FnOrAsyncErrorFn | Array<FnOrAsyncErrorFn>

export type PredicateFn<TIdentifier extends string> = (
  asyncProcess: AsyncProcess<TIdentifier>
) => boolean | Promise<boolean>

export interface IAsyncProcessFns {
  asyncFns: Set<AsyncFn>
  onStartFns: Set<AsyncFn>
  onSuccessFns: Set<AsyncFn>
  onErrorFns: Set<AsyncErrorFn>
}

export type AsyncProcessIdentifiers<TIdentifier extends string> = [
  TIdentifier,
  Maybe<string>
]
