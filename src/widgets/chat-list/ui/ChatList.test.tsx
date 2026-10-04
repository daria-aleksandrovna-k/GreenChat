import { Theme } from '@radix-ui/themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useChatStore } from '@/entities/chat'
import { ChatList } from './ChatList'

function renderList(props: Partial<Parameters<typeof ChatList>[0]> = {}) {
  render(
    <Theme>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ChatList pollError={null} syncing={false} syncError={null} {...props} />
        </MemoryRouter>
      </QueryClientProvider>
    </Theme>,
  )
}

afterEach(() => {
  cleanup()
  useChatStore.getState().reset()
})

describe('ChatList', () => {
  it('shows a loader while chats are loading from the server', () => {
    renderList({ syncing: true })
    expect(screen.getByRole('status')).toHaveTextContent('Загрузка чатов…')
    expect(screen.queryByText(/Чатов пока нет/)).not.toBeInTheDocument()
  })

  it('shows the loader above existing chats', () => {
    useChatStore.getState().addChat({ id: '10', phone: null, title: 'Vasya', tgChatId: '10' })
    renderList({ syncing: true })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Vasya')).toBeInTheDocument()
  })

  it('shows the empty state when loading is done and there are no chats', () => {
    renderList()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText(/Чатов пока нет/)).toBeInTheDocument()
  })

  it('reports a sync error', () => {
    renderList({ syncError: new TypeError('Failed to fetch') })
    expect(screen.getByText(/Не удалось загрузить чаты с сервера/)).toBeInTheDocument()
  })
})

it('shows a date instead of a time for an old last message', () => {
  useChatStore.getState().addChat({ id: '1', phone: null, title: 'Old', tgChatId: '1' })
  useChatStore.getState().touch('1', 'hi', new Date(2025, 11, 31, 10, 0).getTime(), 'out')
  renderList()
  expect(screen.getByText('31.12.2025')).toBeInTheDocument()
})
