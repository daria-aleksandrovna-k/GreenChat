import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useChatStore, type Chat } from '@/entities/chat'
import { useMessageStore } from '@/entities/message'
import { useSessionStore } from '@/entities/session'
import { ApiError, getChatHistory } from '@/shared/api'
import { useChatHistory } from './use-chat-history'

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  getChatHistory: vi.fn(),
}))

const creds = { idInstance: '1', apiTokenInstance: 't' }
const chat: Chat = {
  id: '79876543210@c.us',
  phone: '79876543210',
  title: '+79876543210',
  tgChatId: '10',
  unread: 0,
  lastMessage: null,
  lastMessageAt: null,
  updatedAt: 0,
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

const history = [
  {
    type: 'outgoing',
    idMessage: 'o1',
    timestamp: 100,
    typeMessage: 'textMessage',
    chatId: '10',
    textMessage: 'Hi',
  },
  {
    type: 'incoming',
    idMessage: 'i1',
    timestamp: 200,
    typeMessage: 'textMessage',
    chatId: '10',
    textMessage: 'Hello',
  },
]

beforeEach(() => {
  useSessionStore.getState().login(creds)
  useChatStore.getState().addChat(chat)
  useChatStore.getState().setTgChatId(chat.id, '10')
})
afterEach(() => {
  cleanup()
  useSessionStore.getState().logout()
  useChatStore.getState().reset()
  useMessageStore.getState().reset()
  vi.clearAllMocks()
})

describe('useChatHistory', () => {
  it('loads history by Telegram chat id and merges it', async () => {
    vi.mocked(getChatHistory).mockResolvedValue(history)
    renderHook(() => useChatHistory(chat), { wrapper })
    await waitFor(() => expect(useMessageStore.getState().byChat[chat.id]).toHaveLength(2))
    expect(getChatHistory).toHaveBeenCalledWith(creds, '10')
    expect(useChatStore.getState().chats[chat.id]).toMatchObject({
      lastMessage: 'Hello',
      unread: 0,
    })
  })

  it('does not overwrite a newer local preview', async () => {
    useChatStore.getState().touch(chat.id, 'Local newer', 999_000, 'out')
    useMessageStore.getState().add({
      id: 'local',
      chatId: chat.id,
      text: 'Local newer',
      direction: 'out',
      timestamp: 999_000,
      status: 'sent',
    })
    vi.mocked(getChatHistory).mockResolvedValue(history)
    renderHook(() => useChatHistory(chat), { wrapper })
    await waitFor(() => expect(useMessageStore.getState().byChat[chat.id]).toHaveLength(3))
    expect(useChatStore.getState().chats[chat.id].lastMessage).toBe('Local newer')
  })

  it('does not request history while the Telegram chat id is unknown', async () => {
    const { result } = renderHook(() => useChatHistory({ ...chat, tgChatId: null }), { wrapper })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(getChatHistory).not.toHaveBeenCalled()
    expect(result.current).toEqual({ isLoading: false, error: null })
  })

  it('retries once after a rate limit error', async () => {
    vi.mocked(getChatHistory)
      .mockRejectedValueOnce(new ApiError(429, 'Too Many Requests'))
      .mockResolvedValueOnce(history)
    const { result } = renderHook(() => useChatHistory(chat), { wrapper })
    await waitFor(() => expect(useMessageStore.getState().byChat[chat.id]).toHaveLength(2), {
      timeout: 3000,
    })
    expect(getChatHistory).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBeNull()
  })

  it('does not re-request history when the chat is reopened right away', async () => {
    vi.mocked(getChatHistory).mockResolvedValue(history)
    const client = new QueryClient()
    const shared = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const first = renderHook(() => useChatHistory(chat), { wrapper: shared })
    await waitFor(() => expect(first.result.current.isLoading).toBe(false))
    first.unmount()
    const second = renderHook(() => useChatHistory(chat), { wrapper: shared })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(second.result.current.isLoading).toBe(false)
    expect(getChatHistory).toHaveBeenCalledTimes(1)
  })

  it('exposes errors', async () => {
    vi.mocked(getChatHistory).mockRejectedValue(new ApiError(500, 'Internal Server Error'))
    const { result } = renderHook(() => useChatHistory(chat), { wrapper })
    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiError))
  })
})
