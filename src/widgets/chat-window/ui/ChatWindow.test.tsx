import { Theme } from '@radix-ui/themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useChatStore } from '@/entities/chat'
import { useMessageStore } from '@/entities/message'
import { ChatWindow } from './ChatWindow'

const today = new Date()
today.setHours(12, 0, 0, 0)
const message = (id: string, timestamp: number) => ({
  id,
  chatId: 'c',
  text: `text ${id}`,
  direction: 'in' as const,
  timestamp,
  status: 'sent' as const,
})

afterEach(() => {
  cleanup()
  useChatStore.getState().reset()
  useMessageStore.getState().reset()
})

it('separates messages from different days with day labels', () => {
  useChatStore.getState().addChat({ id: 'c', phone: null, title: 'Vasya', tgChatId: null })
  const old = new Date(2025, 11, 31, 10, 0).getTime()
  useMessageStore.getState().add(message('a', old))
  useMessageStore.getState().add(message('b', old + 60_000))
  useMessageStore.getState().add(message('c', today.getTime()))
  render(
    <Theme>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ChatWindow chatId="c" />
        </MemoryRouter>
      </QueryClientProvider>
    </Theme>,
  )
  const labels = screen.getAllByRole('separator').map((element) => element.textContent)
  expect(labels).toEqual(['31 декабря 2025', 'Сегодня'])
})
