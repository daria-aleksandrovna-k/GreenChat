import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useSessionStore } from '@/entities/session'
import { ApiError } from '@/shared/api'
import { installFakeLocks } from '@/test/fake-locks'
import { pollOnce } from './poll-once'
import { getNextPollDelay, useReceiveMessages } from './use-receive-messages'

vi.mock('./poll-once', () => ({ pollOnce: vi.fn() }))

const creds = { idInstance: '1', apiTokenInstance: 't' }
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function createWrapper() {
  const client = new QueryClient()
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  useSessionStore.getState().logout()
  vi.clearAllMocks()
})

describe('getNextPollDelay', () => {
  it('waits while a request is in flight', () => {
    expect(getNextPollDelay({ fetchStatus: 'fetching', status: 'success', error: null })).toBe(
      false,
    )
  })
  it('polls again immediately after success', () => {
    expect(getNextPollDelay({ fetchStatus: 'idle', status: 'success', error: null })).toBe(1)
  })
  it('pauses after a network error', () => {
    expect(
      getNextPollDelay({ fetchStatus: 'idle', status: 'error', error: new TypeError('x') }),
    ).toBe(5000)
  })
  it('stops on auth errors', () => {
    expect(
      getNextPollDelay({ fetchStatus: 'idle', status: 'error', error: new ApiError(401, '') }),
    ).toBe(false)
  })
})

describe('useReceiveMessages', () => {
  it('does not poll without credentials', async () => {
    renderHook(() => useReceiveMessages(), { wrapper: createWrapper() })
    await act(() => sleep(50))
    expect(pollOnce).not.toHaveBeenCalled()
  })

  it('polls sequentially and stops after unmount', async () => {
    let inFlight = 0
    let maxInFlight = 0
    vi.mocked(pollOnce).mockImplementation(async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await sleep(10)
      inFlight -= 1
      return null
    })
    useSessionStore.getState().login(creds)
    const { unmount } = renderHook(() => useReceiveMessages(), { wrapper: createWrapper() })
    await waitFor(() => expect(vi.mocked(pollOnce).mock.calls.length).toBeGreaterThanOrEqual(4))
    expect(maxInFlight).toBe(1)
    expect(vi.mocked(pollOnce).mock.calls[0][0]).toEqual(creds)
    unmount()
    const callsAtUnmount = vi.mocked(pollOnce).mock.calls.length
    await act(() => sleep(60))
    expect(vi.mocked(pollOnce).mock.calls.length).toBeLessThanOrEqual(callsAtUnmount + 1)
  })

  it('exposes the error and stops polling on auth error', async () => {
    vi.mocked(pollOnce).mockRejectedValue(new ApiError(401, 'Unauthorized'))
    useSessionStore.getState().login(creds)
    const { result } = renderHook(() => useReceiveMessages(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiError))
    await act(() => sleep(50))
    expect(pollOnce).toHaveBeenCalledTimes(1)
  })
})

describe('several tabs', () => {
  it('polls only in the tab that holds the lock', async () => {
    const uninstall = installFakeLocks()
    vi.mocked(pollOnce).mockImplementation(() => new Promise(() => {}))
    // Another tab is already polling this instance
    let releaseOther = () => {}
    void navigator.locks.request(
      'greenchat-poll-1',
      {},
      () => new Promise<void>((resolve) => (releaseOther = resolve)),
    )
    useSessionStore.getState().login(creds)
    renderHook(() => useReceiveMessages(), { wrapper: createWrapper() })
    await act(() => sleep(50))
    expect(pollOnce).not.toHaveBeenCalled()

    releaseOther()
    await waitFor(() => expect(pollOnce).toHaveBeenCalled())
    uninstall()
  })
})
