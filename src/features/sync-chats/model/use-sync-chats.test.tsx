import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { useChatStore } from '@/entities/chat'
import { useSessionStore } from '@/entities/session'
import { ApiError, getChats, lastIncomingMessages, lastOutgoingMessages } from '@/shared/api'
import { useSyncChats } from './use-sync-chats'

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  getChats: vi.fn(),
  lastIncomingMessages: vi.fn(),
  lastOutgoingMessages: vi.fn(),
}))

const creds = { idInstance: '1', apiTokenInstance: 't' }

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

const incoming = {
  type: 'incoming',
  idMessage: 'i1',
  timestamp: 200,
  typeMessage: 'textMessage',
  chatId: '340073657',
  textMessage: 'Hello',
  senderName: 'Daria Kovaleva',
}

beforeEach(() => {
  useSessionStore.getState().login(creds)
  vi.mocked(lastIncomingMessages).mockResolvedValue([incoming])
  vi.mocked(lastOutgoingMessages).mockResolvedValue([])
})
afterEach(() => {
  cleanup()
  useSessionStore.getState().logout()
  useChatStore.getState().reset()
  vi.clearAllMocks()
})

describe('useSyncChats', () => {
  it('loads server chats into an empty list with name and preview', async () => {
    vi.mocked(getChats).mockResolvedValue([{ chatId: '340073657', name: '', phoneNumber: 0 }])
    const { result } = renderHook(() => useSyncChats(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(useChatStore.getState().chats['340073657']).toMatchObject({
      phone: null,
      tgChatId: '340073657',
      title: 'Daria Kovaleva',
      lastMessage: 'Hello',
      lastMessageAt: 200_000,
      unread: 0,
    })
  })

  it('keeps server chats ordered by their last message, not by load time', async () => {
    vi.mocked(getChats).mockResolvedValue([
      { chatId: '1', name: 'Old' },
      { chatId: '2', name: 'Recent' },
      { chatId: '3', name: 'Silent' },
    ])
    vi.mocked(lastIncomingMessages).mockResolvedValue([
      { ...incoming, idMessage: 'a', chatId: '1', timestamp: 100 },
      { ...incoming, idMessage: 'b', chatId: '2', timestamp: 500 },
    ])
    const { result } = renderHook(() => useSyncChats(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const chats = useChatStore.getState().chats
    expect(chats['2'].updatedAt).toBe(500_000)
    expect(chats['1'].updatedAt).toBe(100_000)
    expect(chats['3'].updatedAt).toBe(0)
  })

  it('does not duplicate a local chat and keeps its title', async () => {
    useChatStore.getState().addChat({
      id: '79990001122@c.us',
      phone: '79990001122',
      title: 'Мой контакт',
      tgChatId: null,
    })
    vi.mocked(getChats).mockResolvedValue([
      { chatId: '340073657', name: 'Server name', phoneNumber: 79990001122 },
    ])
    const { result } = renderHook(() => useSyncChats(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const chats = Object.values(useChatStore.getState().chats)
    expect(chats).toHaveLength(1)
    expect(chats[0]).toMatchObject({ title: 'Мой контакт', tgChatId: '340073657' })
  })

  it('still adds chats when journals fail', async () => {
    vi.mocked(getChats).mockResolvedValue([{ chatId: '10', name: 'Vasya' }])
    vi.mocked(lastIncomingMessages).mockRejectedValue(new ApiError(429, 'Too Many Requests'))
    const { result } = renderHook(() => useSyncChats(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(useChatStore.getState().chats['10']).toMatchObject({ title: 'Vasya' })
    expect(result.current.error).toBeNull()
  })

  it('exposes a getChats error without touching local chats', async () => {
    vi.mocked(getChats).mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useSyncChats(), { wrapper })
    await waitFor(() => expect(result.current.error).toBeInstanceOf(TypeError))
    expect(result.current.isLoading).toBe(false)
    expect(useChatStore.getState().chats).toEqual({})
  })

  it('sends one request when React mounts twice (StrictMode)', async () => {
    vi.mocked(getChats).mockResolvedValue([{ chatId: '10', name: 'Vasya' }])
    const client = new QueryClient()
    const strictWrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </StrictMode>
    )
    const { result } = renderHook(() => useSyncChats(), { wrapper: strictWrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(getChats).toHaveBeenCalledTimes(1)
    expect(lastIncomingMessages).toHaveBeenCalledTimes(1)
  })

  it('retries once after a rate limit error', async () => {
    vi.mocked(getChats)
      .mockRejectedValueOnce(new ApiError(429, 'Too Many Requests'))
      .mockResolvedValueOnce([{ chatId: '10', name: 'Vasya' }])
    const { result } = renderHook(() => useSyncChats(), { wrapper })
    await waitFor(() => expect(useChatStore.getState().chats['10']).toBeDefined(), {
      timeout: 3000,
    })
    expect(getChats).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBeNull()
  })

  it('does nothing without credentials', async () => {
    useSessionStore.getState().logout()
    const { result } = renderHook(() => useSyncChats(), { wrapper })
    expect(result.current.isLoading).toBe(false)
    expect(getChats).not.toHaveBeenCalled()
  })
})
