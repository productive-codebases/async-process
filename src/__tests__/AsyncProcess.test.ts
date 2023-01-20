import { Maybe } from '@productive-codebases/toolbox'
import { AsyncProcess } from '../AsyncProcess'
import { debug } from '../logger'
import { IAsyncProcessOptions } from '../types'

interface IData {
  id: number
  name: string
}

type AsyncProcessTestIdentifier = 'loadFoo' | 'loadBar'

describe('AsyncProcess', () => {
  describe.each<Partial<IAsyncProcessOptions>>([
    { deleteFunctionsWhenJobsStarted: false },
    { deleteFunctionsWhenJobsStarted: true },
    {
      debug: {
        logFunctionRegistrations: true,
        logFunctionExecutions: true
      }
    }
  ])('With options: %o', options => {
    function getAsyncProcessTestInstance(
      identifier: AsyncProcessTestIdentifier,
      subIdentifiers?: string[]
    ): AsyncProcess<AsyncProcessTestIdentifier> {
      return AsyncProcess.instance(identifier, subIdentifiers).setOptions(
        options
      )
    }

    beforeEach(() => {
      AsyncProcess.clearInstances()
    })

    describe('On success', () => {
      it('should call the onStart / onSuccess fn(s)', async () => {
        const fetchData = jest
          .fn()
          .mockImplementation(() => Promise.resolve({ id: 1, name: 'Bob' }))
        const onStartFns = [jest.fn(), jest.fn()]
        const onSuccessFns = [jest.fn()]
        const onErrorFn = jest.fn()

        const asyncProcess = getAsyncProcessTestInstance('loadFoo')
          .do(fetchData)
          .onStart(onStartFns)
          .onSuccess(onSuccessFns)
          .onError(onErrorFn)

        await asyncProcess.start()

        onStartFns.forEach(onStartFn => {
          expect(onStartFn).toHaveBeenCalled()
        })

        onSuccessFns.forEach(onSuccessFn => {
          expect(onSuccessFn).toHaveBeenCalled()
        })

        expect(onErrorFn).not.toHaveBeenCalled()
      })

      it('should call the functions sequentially', async () => {
        const fetchData = jest.fn().mockImplementation(() => Promise.resolve())

        const successValues: number[] = []

        const setSuccess = (value: number) => () => {
          successValues.push(value)
        }

        const onStartFns = [jest.fn(), jest.fn()]
        const onSuccessFns = [setSuccess(2), setSuccess(1)]
        const onErrorFn = jest.fn()

        const asyncProcess = getAsyncProcessTestInstance('loadFoo')
          .do(fetchData)
          .onStart(onStartFns)
          .onSuccess(onSuccessFns)
          .onError(onErrorFn)

        await asyncProcess.start()

        expect(successValues).toEqual([2, 1])
      })

      it('should return a success promise', async () => {
        const fetchData = jest.fn().mockImplementation(() => Promise.resolve())

        const asyncProcess =
          getAsyncProcessTestInstance('loadFoo').do(fetchData)

        const doSomethingAfterAsyncProcess = jest.fn()

        await asyncProcess.start().then(() => doSomethingAfterAsyncProcess())

        expect(doSomethingAfterAsyncProcess).toHaveBeenCalled()
      })

      it('should expose the result', async () => {
        const fetchData = jest
          .fn()
          .mockImplementation(() => Promise.resolve({ foo: 'bar' }))

        const asyncProcess =
          getAsyncProcessTestInstance('loadFoo').do(fetchData)

        await asyncProcess.start()

        expect(asyncProcess.result).toEqual({ foo: 'bar' })
      })

      it('should expose the result as an array is multiple jobs', async () => {
        const fetchData1 = jest
          .fn()
          .mockImplementation(() => Promise.resolve({ foo: 'bar' }))

        const fetchData2 = jest
          .fn()
          .mockImplementation(() => Promise.resolve({ foo2: 'bar2' }))

        const asyncProcess = getAsyncProcessTestInstance('loadFoo').do([
          fetchData1,
          fetchData2
        ])

        await asyncProcess.start()

        expect(asyncProcess.result).toEqual([{ foo: 'bar' }, { foo2: 'bar2' }])
      })
    })

    describe('On error', () => {
      it('should call the onStart / onError fn(s)', async () => {
        const fetchData = jest
          .fn()
          .mockImplementation(() =>
            Promise.reject(new Error('Something bad happened'))
          )
        const onStartFns = [jest.fn(), jest.fn()]
        const onSuccessFns = [jest.fn()]
        const onErrorFn = jest.fn()

        const asyncProcess = getAsyncProcessTestInstance('loadFoo')
          .do(fetchData)
          .onStart(onStartFns)
          .onSuccess(onSuccessFns)
          .onError(onErrorFn)

        await asyncProcess.start()

        onStartFns.forEach(onStartFn => {
          expect(onStartFn).toHaveBeenCalled()
        })

        onSuccessFns.forEach(onSuccessFn => {
          expect(onSuccessFn).not.toHaveBeenCalled()
        })

        expect(asyncProcess.result).toEqual(null)
      })

      it('should pass the Error to error functions', async () => {
        class CustomError {
          constructor(readonly error: string) {}
        }

        const fetchData = jest
          .fn()
          .mockImplementation(() =>
            Promise.reject(new CustomError('Something bad happened'))
          )
        const onErrorFn = jest.fn()

        const asyncProcess = getAsyncProcessTestInstance('loadFoo')
          .do(fetchData)
          .onError(onErrorFn)

        await asyncProcess.start()

        expect(onErrorFn).toHaveBeenCalledWith(
          new CustomError('Something bad happened')
        )
      })

      it('should expose the Error object as it', async () => {
        class CustomError {
          constructor(readonly error: string) {}
        }

        const fetchData = jest
          .fn()
          .mockImplementation(() =>
            Promise.reject(new CustomError('Something bad happened'))
          )
        const asyncProcess =
          getAsyncProcessTestInstance('loadFoo').do(fetchData)

        await asyncProcess.start()

        expect(asyncProcess.error).toBeInstanceOf(CustomError)
        expect(asyncProcess.error).toEqual(
          new CustomError('Something bad happened')
        )
      })

      it('should return a success promise even if an error occurred', async () => {
        const fetchData = jest.fn().mockImplementation(() => Promise.reject())

        let errorMessage: Maybe<string> = null

        const setErrorMessage = (message: string) => () => {
          errorMessage = message
        }

        const asyncProcess = getAsyncProcessTestInstance('loadFoo')
          .do(fetchData)
          .onError(setErrorMessage('Something bad happened'))

        const doSomethingAfterAsyncProcess = jest.fn()

        await asyncProcess.start().then(() => doSomethingAfterAsyncProcess())

        expect(doSomethingAfterAsyncProcess).toHaveBeenCalled()
        expect(errorMessage).toEqual('Something bad happened')
      })
    })

    describe('Identifiers', () => {
      describe('onStart', () => {
        it('should use a default identifier so that fns are replaced by default', () => {
          const startSpy1 = jest.fn()
          const startSpy2 = jest.fn()

          const foo1 = getAsyncProcessTestInstance('loadFoo')
          foo1.onStart(startSpy1)

          const foo2 = getAsyncProcessTestInstance('loadFoo')
          foo2.onStart(startSpy1)
          foo2.onStart(startSpy2)

          // register only `startSpy2` because added last
          expect(foo1.fns.onStartFns.size).toBe(1)
          expect(Array.from(foo1.fns.onStartFns.values())).toEqual([
            new Set([startSpy2])
          ])
        })
      })

      describe('onSuccess', () => {
        it('should use a default identifier so that fns are replaced by default', () => {
          const successSpy1 = jest.fn()
          const successSpy2 = jest.fn()

          const foo1 = getAsyncProcessTestInstance('loadFoo')
          foo1.onSuccess(successSpy1)

          const foo2 = getAsyncProcessTestInstance('loadFoo')
          foo2.onSuccess(successSpy1)
          foo2.onSuccess(successSpy2)

          // register only `successSpy2` because added last
          expect(foo1.fns.onSuccessFns.size).toBe(1)
        })

        it('should allow using an identifier to add several fns', async () => {
          const successSpy1 = jest.fn()
          const successSpy2 = jest.fn()
          const successSpy3 = jest.fn()
          const successSpy4 = jest.fn()

          const foo1 = getAsyncProcessTestInstance('loadFoo')
          foo1.onSuccess([successSpy1, successSpy2], 'success1')

          const foo2 = getAsyncProcessTestInstance('loadFoo')
          foo2.onSuccess([successSpy3, successSpy4], 'success2')

          // register `[successSpy1, successSpy2]` and `[successSpy3, successSpy4]`, so 2 entries
          expect(foo1.fns.onSuccessFns.size).toBe(2)

          await foo1.start()

          // check that the 4 fns have been called
          expect(successSpy1).toHaveBeenCalled()
          expect(successSpy2).toHaveBeenCalled()
          expect(successSpy3).toHaveBeenCalled()
          expect(successSpy4).toHaveBeenCalled()
        })
      })

      describe('onError', () => {
        it('should use a default identifier so that fns are replaced by default', () => {
          const errorSpy1 = jest.fn()
          const errorSpy2 = jest.fn()

          const foo1 = getAsyncProcessTestInstance('loadFoo')
          foo1.onError(errorSpy1)

          const foo2 = getAsyncProcessTestInstance('loadFoo')
          foo2.onError(errorSpy1)
          foo2.onError(errorSpy2)

          // register only `errorSpy2` because added last
          expect(foo1.fns.onErrorFns.size).toBe(1)
        })
      })
    })

    describe('Predicates', () => {
      it('should execute jobs if the predicate function is true', async () => {
        const fetchData = jest.fn()
        const predicateFn1 = jest.fn().mockImplementation(() => true)
        const predicateFn2 = jest.fn().mockImplementation(() => true)
        const predicateFn3 = jest.fn().mockImplementation(() => true)
        const predicateFn4 = jest.fn().mockImplementation(() => true)
        const onStartFn = jest.fn()
        const onSuccessFn = jest.fn()
        const onErrorFn = jest.fn()

        const asyncProcess = getAsyncProcessTestInstance('loadFoo')
          .do(fetchData)
          .if(predicateFn1, 'predicate1')
          .if(predicateFn2, 'predicate2')
          .if([predicateFn3, predicateFn4], 'predicate3and4')
          .onStart(onStartFn)
          .onSuccess(onSuccessFn)
          .onError(onErrorFn)

        await asyncProcess.start()

        expect(predicateFn1).toHaveBeenCalled()
        expect(predicateFn2).toHaveBeenCalled()
        expect(predicateFn3).toHaveBeenCalled()
        expect(predicateFn4).toHaveBeenCalled()
        expect(fetchData).toHaveBeenCalled()
        expect(onStartFn).toHaveBeenCalled()
        expect(onSuccessFn).toHaveBeenCalled()
        expect(onErrorFn).not.toHaveBeenCalled()
      })

      it('should not execute jobs if the predicate function is false', async () => {
        const fetchData = jest.fn()
        const predicateFn1 = jest.fn().mockImplementation(() => false)
        const onStartFn = jest.fn()
        const onSuccessFn = jest.fn()
        const onErrorFn = jest.fn()

        const asyncProcess = getAsyncProcessTestInstance('loadFoo')
          .do(fetchData)
          .if(predicateFn1)
          .onStart(onStartFn)
          .onSuccess(onSuccessFn)
          .onError(onErrorFn)

        await asyncProcess.start()

        expect(predicateFn1).toHaveBeenCalled()
        expect(fetchData).not.toHaveBeenCalled()
        expect(onStartFn).not.toHaveBeenCalled()
        expect(onSuccessFn).toHaveBeenCalled()
        expect(onErrorFn).not.toHaveBeenCalled()
      })

      it('should not execute jobs if one of the predicate functions is false', async () => {
        const fetchData = jest.fn()
        const predicateFn1 = jest.fn().mockImplementation(() => true)
        const predicateFn2 = jest.fn().mockImplementation(() => true)
        const predicateFn3 = jest.fn().mockImplementation(() => false)
        const predicateFn4 = jest.fn().mockImplementation(() => true)
        const onStartFn = jest.fn()
        const onSuccessFn = jest.fn()
        const onErrorFn = jest.fn()

        const asyncProcess = getAsyncProcessTestInstance('loadFoo')
          .do(fetchData)
          .if(predicateFn1, 'predicate1')
          .if(predicateFn2, 'predicate2')
          .if([predicateFn3, predicateFn4], 'predicate3and4')
          .onStart(onStartFn)
          .onSuccess(onSuccessFn)
          .onError(onErrorFn)

        await asyncProcess.start()

        expect(predicateFn1).toHaveBeenCalled()
        expect(predicateFn2).toHaveBeenCalled()
        expect(predicateFn3).toHaveBeenCalled()
        // not called because predicateFn3 is falsy
        expect(predicateFn4).not.toHaveBeenCalled()
        expect(fetchData).not.toHaveBeenCalled()
        expect(onStartFn).not.toHaveBeenCalled()
        expect(onSuccessFn).toHaveBeenCalled()
        expect(onErrorFn).not.toHaveBeenCalled()
      })
    })

    describe('AsyncProcess composition', () => {
      it('should compose AsyncProcess instances', async () => {
        const fetchData = jest
          .fn()
          .mockImplementation(() => Promise.resolve({ id: 1, name: 'Bob' }))

        const onStartFn0 = jest.fn()
        const onStartFn1 = jest.fn()
        const onStartFn2 = jest.fn()
        const onStartFn3 = jest.fn()
        const onStartFn4 = jest.fn()

        const onSuccessFn = jest.fn()

        const onErrorFn = jest.fn()

        let asyncProcessBaseIdentifiers

        const asyncProcessExtended = (
          asyncProcess: AsyncProcess<AsyncProcessTestIdentifier>
        ) => {
          const baseAsyncProcess = getAsyncProcessTestInstance(
            asyncProcess.identifier,
            ['id1', 'id2']
          )
            // define custom identifiers for each fns addition
            .onStart(onStartFn1, 'onStartFn1')
            .onStart(onStartFn2, 'onStartFn2')
            .onStart([onStartFn3, onStartFn4], 'onStartFn3+onStartFn4')
            .onSuccess(onSuccessFn)
            .onError(onErrorFn)

          asyncProcessBaseIdentifiers = baseAsyncProcess.identitiers

          return baseAsyncProcess
        }

        const asyncProcess = getAsyncProcessTestInstance('loadFoo')
          .do(fetchData)
          .onStart(onStartFn0, 'onStartFn0')
          .compose(asyncProcessExtended)

        await asyncProcess.start()

        expect(onStartFn0).toHaveBeenCalled()
        expect(onStartFn1).toHaveBeenCalled()
        expect(onStartFn2).toHaveBeenCalled()
        expect(onStartFn3).toHaveBeenCalled()
        expect(onStartFn4).toHaveBeenCalled()

        expect(onSuccessFn).toHaveBeenCalled()

        expect(onErrorFn).not.toHaveBeenCalled()

        // Count the number of additions (by uniq identifiers) of onStartFns entries
        expect(asyncProcess.fns.onStartFns.size).toEqual(
          options.deleteFunctionsWhenJobsStarted ? 0 : 4
        )

        expect(asyncProcess.result).toEqual({
          id: 1,
          name: 'Bob'
        })

        expect(asyncProcessBaseIdentifiers).toEqual(['loadFoo', 'id1/id2'])
      })
    })

    describe('Singleton', () => {
      it('should return an unique instance for a same identifier', () => {
        const successSpy = jest.fn()

        const foo1 = getAsyncProcessTestInstance('loadFoo')
        foo1.onSuccess(successSpy)
        const foo2 = getAsyncProcessTestInstance('loadFoo')

        const bar1 = getAsyncProcessTestInstance('loadBar')
        const bar2 = getAsyncProcessTestInstance('loadBar')

        expect(foo1).toBe(foo2)
        expect(bar1).toBe(bar2)

        expect(foo1).not.toBe(bar1)
        expect(foo2).not.toBe(bar2)

        expect(foo1.fns.onSuccessFns.size).toBe(1)
        expect(foo2.fns.onSuccessFns.size).toBe(1)
      })

      it('should return an unique instance for same identifiers', () => {
        const successSpy = jest.fn()

        const foo1 = getAsyncProcessTestInstance('loadFoo')
        foo1.onSuccess(successSpy)

        const foo1Dep1 = getAsyncProcessTestInstance('loadFoo', ['dep1'])
        const foo2Dep1 = getAsyncProcessTestInstance('loadFoo', ['dep1'])

        const foo1Dep2 = getAsyncProcessTestInstance('loadFoo', ['dep2'])
        const foo2Dep2 = getAsyncProcessTestInstance('loadFoo', ['dep2'])

        expect(foo1Dep1).toBe(foo2Dep1)
        expect(foo1Dep2).toBe(foo2Dep2)

        expect(foo1).not.toBe(foo1Dep1)
        expect(foo1Dep1).not.toBe(foo1Dep2)

        expect(foo1Dep1.identifier).toBe('loadFoo')
        expect(foo1Dep1.identitiers).toEqual(['loadFoo', 'dep1'])

        expect(foo1.fns.onSuccessFns.size).toBe(1)
        expect(foo1Dep1.fns.onSuccessFns.size).toBe(0)
      })
    })

    describe('Options', () => {
      describe('deleteFunctionsWhenJobsStarted', () => {
        it('should reset functions when async process is successful', async () => {
          const fetchData = jest.fn()
          const successSpy1 = jest.fn()
          const successSpy2 = jest.fn()
          const successSpy3 = jest.fn()
          const errorSpy1 = jest.fn()

          const foo1 = getAsyncProcessTestInstance('loadFoo').do(fetchData)

          foo1
            .onSuccess(successSpy1, 'success1')
            .onSuccess(successSpy2, 'success2')
            .onError(errorSpy1, 'error1')

          expect(foo1.fns.onSuccessFns.size).toBe(2)
          expect(foo1.fns.onErrorFns.size).toBe(1)

          await foo1.start()

          foo1
            .onSuccess(successSpy3, 'success3')
            .onError(errorSpy1, 'error1bis')

          expect(foo1.fns.onSuccessFns.size).toBe(
            // if deleteFunctionsWhenJobsStarted, fns have been removed after the start,
            // so we get only `success3`
            options.deleteFunctionsWhenJobsStarted ? 1 : 3
          )

          expect(foo1.fns.onErrorFns.size).toBe(
            // if deleteFunctionsWhenJobsStarted, fns have been removed after the start,
            // so we get only `error1bis`
            options.deleteFunctionsWhenJobsStarted ? 1 : 2
          )
        })

        it('should reset functions when async process has failed', async () => {
          const fetchData = jest.fn().mockImplementation(() => Promise.reject())
          const successSpy1 = jest.fn()
          const successSpy2 = jest.fn()
          const successSpy3 = jest.fn()
          const errorSpy1 = jest.fn()

          const foo1 = getAsyncProcessTestInstance('loadFoo').do(fetchData)

          foo1
            .onSuccess(successSpy1, 'success1')
            .onSuccess(successSpy2, 'success2')
            .onError(errorSpy1, 'error1')

          expect(foo1.fns.onSuccessFns.size).toBe(2)
          expect(foo1.fns.onErrorFns.size).toBe(1)

          await foo1.start()

          foo1
            .onSuccess(successSpy3, 'success3')
            .onError(errorSpy1, 'error1bis')

          expect(foo1.fns.onSuccessFns.size).toBe(
            // if deleteFunctionsWhenJobsStarted, fns have been removed after the start,
            // so we get only `success3`
            options.deleteFunctionsWhenJobsStarted ? 1 : 3
          )

          expect(foo1.fns.onErrorFns.size).toBe(
            // if deleteFunctionsWhenJobsStarted, fns have been removed after the start,
            // so we get only `error1bis`
            options.deleteFunctionsWhenJobsStarted ? 1 : 2
          )
        })
      })

      describe('Logging', () => {
        // Mock the log function
        let logs: any[] = []

        beforeEach(() => {
          debug.enable(
            options.debug?.logFunctionExecutions ? 'AsyncProcess:*' : false
          )

          debug.formatters.s = (s: string) => {
            return s
          }

          debug.log = (...args: any[]) => {
            logs.push(...args)
          }
        })

        afterEach(() => {
          // reset logs for each test
          logs = []
        })

        it('should log different events if success', async () => {
          const fetchData = jest.fn()
          const predicateFn1 = jest.fn().mockImplementation(() => true)
          const onStartFn = jest.fn()
          const onSuccessFn = jest.fn()
          const onErrorFn = jest.fn()

          await getAsyncProcessTestInstance('loadFoo')
            .setOptions({
              debug: {
                logFunctionRegistrations: true,
                logFunctionExecutions: true
              }
            })
            .do(fetchData)
            .if(predicateFn1)
            .onStart(onStartFn)
            .onSuccess(onSuccessFn)
            .onError(onErrorFn)
            .start()

          expect(logs).toMatchSnapshot()
        })

        it('should log different events if error', async () => {
          const fetchData = jest.fn().mockImplementation(() => Promise.reject())
          const predicateFn1 = jest.fn().mockImplementation(() => true)
          const onStartFn = jest.fn()
          const onSuccessFn = jest.fn()
          const onErrorFn = jest.fn()

          const asyncProcess = getAsyncProcessTestInstance('loadFoo')
            .setOptions({
              debug: {
                logFunctionRegistrations: true,
                logFunctionExecutions: true
              }
            })
            .do(fetchData)
            .if(predicateFn1)
            .onStart(onStartFn)
            .onSuccess(onSuccessFn)
            .onError(onErrorFn)

          await asyncProcess.start()

          expect(logs).toMatchSnapshot()
        })
      })
    })
  })
})
