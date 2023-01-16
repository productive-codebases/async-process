import { Maybe } from '@productive-codebases/toolbox'
import { AsyncProcess } from '../AsyncProcess'

interface IData {
  id: number
  name: string
}

type AsyncProcessTestIdentifier = 'loadFoo' | 'loadBar'

function getAsyncProcessTestInstance(
  identifier: AsyncProcessTestIdentifier,
  subIdentifiers?: string[]
): AsyncProcess<AsyncProcessTestIdentifier> {
  return AsyncProcess.instance(identifier, subIdentifiers)
}

describe('AsyncProcess', () => {
  let data: Maybe<IData> = null

  const setData = (data_: any) => {
    data = data_
  }

  beforeEach(() => {
    data = null
    AsyncProcess.clearInstances()
  })

  describe('On success', () => {
    it('should call the onStart / onSuccess fn(s)', async () => {
      const fetchData = (): Promise<null> => {
        return new Promise(resolve => {
          setTimeout(() => {
            setData({ id: 1, name: 'Bob' })
            resolve(null)
          }, 50)
        })
      }

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

      expect(data).toEqual({
        id: 1,
        name: 'Bob'
      })
    })

    it('should call the functions sequentially', async () => {
      const fetchData = (): Promise<null> => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(null)
          }, 50)
        })
      }

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
      const fetchData = (): Promise<null> => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(null)
          }, 50)
        })
      }

      const asyncProcess = getAsyncProcessTestInstance('loadFoo').do(fetchData)

      const doSomethingAfterAsyncProcess = jest.fn()

      await asyncProcess.start().then(() => doSomethingAfterAsyncProcess())

      expect(doSomethingAfterAsyncProcess).toHaveBeenCalled()
    })
  })

  describe('On error', () => {
    it('should call the onStart / onError fn(s)', async () => {
      const fetchData = (): Promise<any> => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Something bad happened'))
          }, 50)
        })
      }

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

      expect(data).toEqual(null)
    })

    it('should pass the Error to error functions', async () => {
      const error = new Error('Something bad happened')

      const fetchData = (): Promise<any> => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(error)
          }, 50)
        })
      }

      const onErrorFn = jest.fn()

      const asyncProcess = getAsyncProcessTestInstance('loadFoo')
        .do(fetchData)
        .onError(onErrorFn)

      await asyncProcess.start()

      expect(onErrorFn).toHaveBeenCalledWith(error)
    })

    it('should expose the Error', async () => {
      const fetchData = (): Promise<any> => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Something bad happened'))
          }, 50)
        })
      }

      const asyncProcess = getAsyncProcessTestInstance('loadFoo').do(fetchData)

      await asyncProcess.start()

      expect(data).toEqual(null)
      expect(asyncProcess.error).toBeInstanceOf(Error)
      expect(asyncProcess.error?.message).toEqual('Something bad happened')
    })

    it('should return a success promise even if an error occurred', async () => {
      const fetchData = (): Promise<null> => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject()
          }, 50)
        })
      }

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
    it('should execute the async process if the predicate function is true', async () => {
      const fetchData = jest.fn()
      const predicateFn1 = jest.fn().mockImplementation(() => true)
      const predicateFn2 = jest.fn().mockImplementation(() => true)
      const onStartFn = jest.fn()
      const onSuccessFn = jest.fn()
      const onErrorFn = jest.fn()

      const asyncProcess = getAsyncProcessTestInstance('loadFoo')
        .do(fetchData)
        .if(predicateFn1)
        .if(predicateFn2)
        .onStart(onStartFn)
        .onSuccess(onSuccessFn)
        .onError(onErrorFn)

      await asyncProcess.start()

      expect(predicateFn1).toHaveBeenCalled()
      expect(predicateFn2).toHaveBeenCalled()
      expect(fetchData).toHaveBeenCalled()
      expect(onStartFn).toHaveBeenCalled()
      expect(onSuccessFn).toHaveBeenCalled()
      expect(onErrorFn).not.toHaveBeenCalled()
    })

    it('should not execute the async process if the predicate function is false', async () => {
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

    it('should not execute the async process if one of the predicate functions is false', async () => {
      const fetchData = jest.fn()
      const predicateFn1 = jest.fn().mockImplementation(() => true)
      const predicateFn2 = jest.fn().mockImplementation(() => true)
      const predicateFn3 = jest.fn().mockImplementation(() => false)
      const onStartFn = jest.fn()
      const onSuccessFn = jest.fn()
      const onErrorFn = jest.fn()

      const asyncProcess = getAsyncProcessTestInstance('loadFoo')
        .do(fetchData)
        .if(predicateFn1)
        .if(predicateFn2)
        .if(predicateFn3)
        .onStart(onStartFn)
        .onSuccess(onSuccessFn)
        .onError(onErrorFn)

      await asyncProcess.start()

      expect(predicateFn1).toHaveBeenCalled()
      expect(predicateFn2).toHaveBeenCalled()
      expect(predicateFn3).toHaveBeenCalled()
      expect(fetchData).not.toHaveBeenCalled()
      expect(onStartFn).not.toHaveBeenCalled()
      expect(onSuccessFn).toHaveBeenCalled()
      expect(onErrorFn).not.toHaveBeenCalled()
    })
  })

  describe('AsyncProcess composition', () => {
    it('should compose AsyncProcess instances', async () => {
      const fetchData = (): Promise<null> => {
        return new Promise(resolve => {
          setTimeout(() => {
            setData({ id: 1, name: 'Bob' })
            resolve(null)
          }, 50)
        })
      }

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
      expect(asyncProcess.fns.onStartFns.size).toEqual(4)

      expect(data).toEqual({
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
})
