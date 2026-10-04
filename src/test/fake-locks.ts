type LockCallback = (lock: { name: string }) => Promise<unknown>

/** Minimal navigator.locks for tests: exclusive locks with a queue */
export function installFakeLocks(): () => void {
  const held = new Set<string>()
  const queues = new Map<string, Array<() => void>>()

  const request = (name: string, options: { signal?: AbortSignal }, callback: LockCallback) =>
    new Promise((resolve, reject) => {
      const run = () => {
        held.add(name)
        callback({ name })
          .then(resolve, reject)
          .finally(() => {
            held.delete(name)
            queues.get(name)?.shift()?.()
          })
      }
      if (!held.has(name)) {
        run()
        return
      }
      const queue = queues.get(name) ?? []
      queues.set(name, queue)
      queue.push(run)
      options.signal?.addEventListener('abort', () => {
        const index = queue.indexOf(run)
        if (index >= 0) queue.splice(index, 1)
        reject(options.signal?.reason)
      })
    })

  Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })
  return () => {
    Reflect.deleteProperty(navigator, 'locks')
  }
}
