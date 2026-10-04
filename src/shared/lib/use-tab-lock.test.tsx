import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { installFakeLocks } from '@/test/fake-locks'
import { useTabLock } from './use-tab-lock'

afterEach(() => cleanup())

describe('useTabLock', () => {
  it('is held by only one tab at a time and passes to the next one', async () => {
    const uninstall = installFakeLocks()
    const first = renderHook(() => useTabLock('poll'))
    const second = renderHook(() => useTabLock('poll'))
    await waitFor(() => expect(first.result.current).toBe(true))
    expect(second.result.current).toBe(false)

    act(() => first.unmount())
    await waitFor(() => expect(second.result.current).toBe(true))
    uninstall()
  })

  it('is not held without a lock name', () => {
    const uninstall = installFakeLocks()
    const { result } = renderHook(() => useTabLock(null))
    expect(result.current).toBe(false)
    uninstall()
  })

  it('treats every tab as the holder when Web Locks are unavailable', () => {
    const { result } = renderHook(() => useTabLock('poll'))
    expect(result.current).toBe(true)
  })
})
