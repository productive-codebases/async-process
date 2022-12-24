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

    it('should avoid starting during a delay', async () => {
      const doSomething = jest.fn()

      const asyncProcess = getAsyncProcessTestInstance('loadFoo')
        .do(doSomething)
        .if(olderThan(1))

      await asyncProcess.start()
      await asyncProcess.start()

      // 1 instead of 2
      expect(doSomething).toHaveBeenCalledTimes(1)
    })

    it('should start after the delay', async () => {
      const doSomething = jest.fn()

      const asyncProcess = getAsyncProcessTestInstance('loadFoo')
        .do(doSomething)
        .if(olderThan(1))

      await asyncProcess.start()
      await wait(1.5)
      await asyncProcess.start()

      expect(doSomething).toHaveBeenCalledTimes(2)
    })

    describe('cancelOlderThanDelay', () => {
      it('shouldnt cancel the delay if the sub dependencies dont match', async () => {
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
