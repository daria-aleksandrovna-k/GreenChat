import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useLogout } from '@/features/auth-login'
import { useReceiveMessages } from '@/features/receive-messages'
import { useChatStore } from '@/entities/chat'
import { useMessageStore } from '@/entities/message'
import { useSessionStore } from '@/entities/session'
import { deleteNotification, receiveNotification } from '@/shared/api'

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  receiveNotification: vi.fn(),
  deleteNotification: vi.fn(),
}))

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

afterEach(() => {
  cleanup()
  useSessionStore.getState().logout()
  vi.clearAllMocks()
})

it('stops polling and writes nothing when the user logs out mid-poll', async () => {
  // The server responds after the user has logged out
  vi.mocked(receiveNotification).mockImplementation(async () => {
    await sleep(50)
    return {
      receiptId: 1,
      body: {
        typeWebhook: 'incomingMessageReceived',
        timestamp: 1,
        idMessage: 'late',
        senderData: { chatId: '10', senderPhoneNumber: 79990000000 },
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'late' } },
      },
    }
  })
  useSessionStore.getState().login({ idInstance: '1', apiTokenInstance: 't' })
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(
    () => {
      useReceiveMessages()
      return useLogout()
    },
    { wrapper },
  )
  await act(() => sleep(10))
  expect(receiveNotification).toHaveBeenCalledTimes(1)

  act(() => result.current())
  await act(() => sleep(120))

  expect(receiveNotification).toHaveBeenCalledTimes(1)
  expect(deleteNotification).not.toHaveBeenCalled()
  expect(useChatStore.getState().chats).toEqual({})
  expect(useMessageStore.getState().byChat).toEqual({})
})
