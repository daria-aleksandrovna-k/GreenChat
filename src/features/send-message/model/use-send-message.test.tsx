import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useChatStore, type Chat } from '@/entities/chat'
import { useMessageStore } from '@/entities/message'
import { useSessionStore } from '@/entities/session'
import { sendMessage } from '@/shared/api'
import { useSendMessage } from './use-send-message'

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  sendMessage: vi.fn(),
}))

const creds = { idInstance: '1', apiTokenInstance: 't' }
const chat: Chat = {
  id: '79876543210@c.us',
  phone: '79876543210',
  title: '+79876543210',
  tgChatId: null,
  unread: 0,
  lastMessage: null,
  lastMessageAt: null,
  updatedAt: 0,
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  )
}

const messages = () => useMessageStore.getState().byChat[chat.id] ?? []

beforeEach(() => {
  useSessionStore.getState().login(creds)
  useChatStore.getState().addChat(chat)
})
afterEach(() => {
  cleanup()
  useSessionStore.getState().logout()
  useChatStore.getState().reset()
  useMessageStore.getState().reset()
  vi.clearAllMocks()
})

describe('useSendMessage', () => {
  it('shows the message immediately and marks it sent', async () => {
    let resolve!: (v: { idMessage: string }) => void
    vi.mocked(sendMessage).mockReturnValue(new Promise((r) => (resolve = r)))
    const { result } = renderHook(() => useSendMessage(chat), { wrapper })

    act(() => result.current.send('Hi'))
    expect(messages()).toEqual([
      expect.objectContaining({ text: 'Hi', direction: 'out', status: 'sending' }),
    ])
    expect(useChatStore.getState().chats[chat.id].lastMessage).toBe('Hi')
    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith(creds, {
        chatId: '79876543210@c.us',
        message: 'Hi',
      }),
    )

    await act(async () => resolve({ idMessage: '1' }))
    await waitFor(() => expect(messages()[0].status).toBe('sent'))
    expect(messages()[0].serverId).toBe('1')
  })

  it('sends to tgChatId when known', async () => {
    vi.mocked(sendMessage).mockResolvedValue({ idMessage: '1' })
    const { result } = renderHook(() => useSendMessage({ ...chat, tgChatId: '10000000' }), {
      wrapper,
    })
    act(() => result.current.send('Hi'))
    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith(creds, { chatId: '10000000', message: 'Hi' }),
    )
  })

  it('updates the original chat when the user switches chats mid-send', async () => {
    let resolve!: (v: { idMessage: string }) => void
    vi.mocked(sendMessage).mockReturnValue(new Promise((r) => (resolve = r)))
    const other: Chat = { ...chat, id: '70000000000@c.us', phone: '70000000000' }
    useChatStore.getState().addChat(other)
    const { result, rerender } = renderHook(({ current }) => useSendMessage(current), {
      wrapper,
      initialProps: { current: chat },
    })

    act(() => result.current.send('Hi'))
    await waitFor(() => expect(sendMessage).toHaveBeenCalled())
    rerender({ current: other })
    await act(async () => resolve({ idMessage: '1' }))

    await waitFor(() => expect(messages()[0].status).toBe('sent'))
  })

  it('marks failures and retries them', async () => {
    vi.mocked(sendMessage).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useSendMessage(chat), { wrapper })

    act(() => result.current.send('Hi'))
    await waitFor(() => expect(messages()[0].status).toBe('error'))
    expect(messages()[0].error).toContain('Нет соединения')

    vi.mocked(sendMessage).mockResolvedValueOnce({ idMessage: '2' })
    act(() => result.current.retry(messages()[0]))
    await waitFor(() => expect(messages()[0].status).toBe('sent'))
    expect(messages()).toHaveLength(1)
  })
})
