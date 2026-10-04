import { useEffect, useState } from 'react'

const locksSupported = (): boolean => typeof navigator !== 'undefined' && 'locks' in navigator

/**
 * An exclusive lock across tabs (Web Locks API): true while this tab holds the lock.
 * Without Web Locks support every tab is treated as the holder.
 */
export function useTabLock(name: string | null): boolean {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!name || !locksSupported()) return
    const controller = new AbortController()
    let release = () => {}
    navigator.locks
      .request(
        name,
        { signal: controller.signal },
        () =>
          new Promise<void>((resolve) => {
            release = resolve
            setHeld(true)
          }),
      )
      .catch(() => {
        // The request was cancelled on unmount, which is expected
      })
    return () => {
      controller.abort()
      release()
      setHeld(false)
    }
  }, [name])

  if (!name) return false
  return locksSupported() ? held : true
}
