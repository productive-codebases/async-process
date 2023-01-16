import { AsyncProcess } from '../..'
import { withLogs } from '../withLogs'

type AsyncProcessTestIdentifier = 'loadFoo' | 'loadBar'

function getAsyncProcessTestInstance(
  identifier: AsyncProcessTestIdentifier,
  subIdentifiers?: string[]
): AsyncProcess<AsyncProcessTestIdentifier> {
  return AsyncProcess.instance(identifier, subIdentifiers)
}

function doSomething() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ data: 'someData' })
    }, 0)
  })
}

describe('Composers', () => {
  describe('withLogs', () => {
    beforeEach(() => {
      AsyncProcess.clearInstances()
    })

    it('should logs states if success', async () => {
      const logger = jest.fn()

      await getAsyncProcessTestInstance('loadFoo')
        .do(doSomething)
        .compose(withLogs(logger))
        .start()

      expect(logger).toHaveBeenCalledTimes(2)
      expect(logger).toHaveBeenNthCalledWith(1, 'Start %s', 'loadFoo')
      expect(logger).toHaveBeenNthCalledWith(2, 'Success %s', 'loadFoo')
    })

    it('should logs states if error', async () => {
      const logger = jest.fn()

      await getAsyncProcessTestInstance('loadFoo')
        .do(() =>
          doSomething().then(() => {
            throw new Error('boom')
          })
        )
        .compose(withLogs(logger))
        .start()

      expect(logger).toHaveBeenCalledTimes(2)
      expect(logger).toHaveBeenNthCalledWith(1, 'Start %s', 'loadFoo')
      expect(logger).toHaveBeenNthCalledWith(
        2,
        'Error %s: %o',
        'loadFoo',
        new Error('boom')
      )
    })

    it('should logs various things by using different identifiers', async () => {
      const logger1 = jest.fn()
      const logger2 = jest.fn()
      const logger3 = jest.fn()

      await getAsyncProcessTestInstance('loadFoo')
        .do(doSomething)
        .compose(withLogs(logger1))
        .compose(withLogs(logger2, 'secondLogger'))
        .compose(withLogs(logger3, 'thirdLogger'))
        .start()

      expect(logger1).toHaveBeenCalledTimes(2)
      expect(logger2).toHaveBeenCalledTimes(2)
      expect(logger3).toHaveBeenCalledTimes(2)
    })
  })
})
