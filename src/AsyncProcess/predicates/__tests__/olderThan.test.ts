import { AsyncProcess } from '../..'
import {
  cancelOlderThanDelay as cancelOlderThanDelay_,
  olderThan
} from '../olderThan'

type AsyncProcessTestIdentifier = 'loadFoo' | 'loadBar'

const getAsyncProcessTestInstance =
  AsyncProcess.instance<AsyncProcessTestIdentifier>

const cancelOlderThanDelay = cancelOlderThanDelay_<AsyncProcessTestIdentifier>

function wait(seconds: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, seconds * 1000)
  })
}

describe('Predicates', () => {
  describe('olderThan', () => {
    beforeEach(() => {
      AsyncProcess.clearInstances()
    })

    it('should not trigger the job during a delay', async () => {
      const doSomething = jest.fn()

      const asyncProcess = getAsyncProcessTestInstance('loadFoo')
        .do(doSomething)
        .if(olderThan(1))

      await asyncProcess.start()
      await asyncProcess.start()

      // called only once because the second time was during the delay
      expect(doSomething).toHaveBeenCalledTimes(1)
    })

    it('should trigger the job after the delay', async () => {
      const doSomething = jest.fn()

      const asyncProcess = getAsyncProcessTestInstance('loadFoo')
        .do(doSomething)
        .if(olderThan(1))

      await asyncProcess.start()
      await wait(1.5)
      await asyncProcess.start()

      // called twice because the delay has expired
      expect(doSomething).toHaveBeenCalledTimes(2)
    })

    it('should not trigger the job if the dependencies have not changed', async () => {
      const doSomething = jest.fn()

      const asyncProcess1 = getAsyncProcessTestInstance('loadFoo')
        .do(doSomething)
        .if(olderThan(1, [1, 'foo', true]))

      await asyncProcess1.start()

      const asyncProcess2 = getAsyncProcessTestInstance('loadFoo')
        .do(doSomething)
        .if(olderThan(1, [1, 'foo', true]))

      await asyncProcess2.start()

      // called only once because the dependencies have not changed
      expect(doSomething).toHaveBeenCalledTimes(1)
    })

    it('should trigger the job if the dependencies have changed', async () => {
      const doSomething = jest.fn()

      const asyncProcess1 = getAsyncProcessTestInstance('loadFoo')
        .do(doSomething)
        .if(olderThan(1, [1, 'foo', true]))

      await asyncProcess1.start()

      const asyncProcess2 = getAsyncProcessTestInstance('loadFoo')
        .do(doSomething)
        .if(olderThan(1, [1, 'foo', false]))

      await asyncProcess2.start()

      // called twice because the deps have changed
      expect(doSomething).toHaveBeenCalledTimes(2)
    })

    it('should trigger the job if the dependencies have not changed but if this is not the same AP instance', async () => {
      const doSomething = jest.fn()

      const asyncProcess1 = getAsyncProcessTestInstance('loadFoo')
        .do(doSomething)
        .if(olderThan(1, [1, 'foo', true]))

      await asyncProcess1.start()

      const asyncProcess2 = getAsyncProcessTestInstance('loadBar')
        .do(doSomething)
        .if(olderThan(1, [1, 'foo', true]))

      await asyncProcess2.start()

      // called twice because this is 2 different AP instances
      expect(doSomething).toHaveBeenCalledTimes(2)
    })

    describe('cancelOlderThanDelay', () => {
      it('shouldnt cancel the delay if the sub identifiers dont match', async () => {
        const doSomething = jest.fn()

        const asyncProcess = getAsyncProcessTestInstance('loadFoo', ['uuid1'])
          .do(doSomething)
          .if(olderThan(1))

        await asyncProcess.start()

        // uuid2 !== uuid1, so it should not cancel the delay
        cancelOlderThanDelay('loadFoo', ['uuid2'])

        await asyncProcess.start()

        expect(doSomething).toHaveBeenCalledTimes(1)
      })

      it('should start if the delay has been cancelled', async () => {
        const doSomething = jest.fn()

        const asyncProcess = getAsyncProcessTestInstance('loadFoo', ['uuid1'])
          .do(doSomething)
          .if(olderThan(1))

        await asyncProcess.start()

        cancelOlderThanDelay('loadFoo', ['uuid1'])

        await asyncProcess.start()

        expect(doSomething).toHaveBeenCalledTimes(2)
      })
    })
  })
})
