export function installBrowserCoordination() {
  let tail: Promise<unknown> = Promise.resolve()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (_name: string, callback: () => Promise<unknown>) => {
        const operation = tail.then(callback)
        tail = operation.catch(() => undefined)
        return operation
      },
    },
  })
  const channels = new Set<TestChannel>()
  class TestChannel extends EventTarget {
    constructor() {
      super()
      channels.add(this)
    }
    postMessage(data: unknown) {
      channels.forEach((channel) => {
        if (channel !== this)
          queueMicrotask(() =>
            channel.dispatchEvent(new MessageEvent('message', { data })),
          )
      })
    }
    close() {
      channels.delete(this)
    }
  }
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    configurable: true,
    value: TestChannel,
  })
}
