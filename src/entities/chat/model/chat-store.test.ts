import { useChatStore } from './chat-store'

const chat = { id: '79876543210@c.us', phone: '79876543210', title: '+79876543210', tgChatId: null }

afterEach(() => useChatStore.getState().reset())

describe('chat store', () => {
  it('adds a chat once', () => {
    useChatStore.getState().addChat(chat)
    useChatStore.getState().addChat({ ...chat, title: 'Other' })
    const stored = useChatStore.getState().chats[chat.id]
    expect(stored).toMatchObject({ title: '+79876543210', unread: 0, lastMessage: null })
  })

  it('counts unread only for incoming messages in inactive chats', () => {
    const store = useChatStore.getState()
    store.addChat(chat)
    store.touch(chat.id, 'hi', 1000, 'in')
    store.touch(chat.id, 'me', 2000, 'out')
    expect(useChatStore.getState().chats[chat.id]).toMatchObject({ unread: 1, lastMessage: 'me' })
    store.setActive(chat.id)
    expect(useChatStore.getState().chats[chat.id].unread).toBe(0)
    store.touch(chat.id, 'again', 3000, 'in')
    expect(useChatStore.getState().chats[chat.id].unread).toBe(0)
  })

  it('stores Telegram chat id and ignores unknown chats', () => {
    const store = useChatStore.getState()
    store.addChat(chat)
    store.setTgChatId(chat.id, '10000000')
    store.setTgChatId('missing', '1')
    store.touch('missing', 'x', 1, 'in')
    expect(useChatStore.getState().chats[chat.id].tgChatId).toBe('10000000')
    expect(useChatStore.getState().chats.missing).toBeUndefined()
  })

  it('does not persist activeChatId', () => {
    useChatStore.getState().addChat(chat)
    useChatStore.getState().setActive(chat.id)
    expect(localStorage.getItem('greenchat-chats')).not.toContain('activeChatId')
  })
})

describe('cross-tab sync', () => {
  it('picks up chats written by another tab', async () => {
    const otherTab = { ...chat, unread: 0, lastMessage: 'from B', updatedAt: 1 }
    const newValue = JSON.stringify({ state: { chats: { [chat.id]: otherTab } }, version: 0 })
    localStorage.setItem('greenchat-chats', newValue)
    window.dispatchEvent(new StorageEvent('storage', { key: 'greenchat-chats', newValue }))
    await vi.waitFor(() =>
      expect(useChatStore.getState().chats[chat.id]?.lastMessage).toBe('from B'),
    )
  })
})

describe('last message time', () => {
  it('tracks the time of the last message, not chat creation', () => {
    const store = useChatStore.getState()
    store.addChat(chat)
    expect(useChatStore.getState().chats[chat.id].lastMessageAt).toBeNull()
    store.touch(chat.id, 'hi', 5000, 'in')
    expect(useChatStore.getState().chats[chat.id].lastMessageAt).toBe(5000)
  })

  it('keeps the newer preview when an older message arrives', () => {
    const store = useChatStore.getState()
    store.addChat(chat)
    store.touch(chat.id, 'new', 5000, 'out')
    store.touch(chat.id, 'old', 1000, 'in')
    expect(useChatStore.getState().chats[chat.id]).toMatchObject({
      lastMessage: 'new',
      lastMessageAt: 5000,
      unread: 1,
    })
  })
})

describe('persist migration', () => {
  it('migrates v0 chats by adding lastMessageAt', async () => {
    const v0 = { ...chat, unread: 0, lastMessage: 'hi', updatedAt: 7000 }
    localStorage.setItem(
      'greenchat-chats',
      JSON.stringify({ state: { chats: { [chat.id]: v0 } }, version: 0 }),
    )
    await useChatStore.persist.rehydrate()
    expect(useChatStore.getState().chats[chat.id].lastMessageAt).toBe(7000)
    expect(localStorage.getItem('greenchat-chats')).toContain('"version":1')
  })
})

it('addChat accepts an explicit updatedAt for chats loaded from the server', () => {
  useChatStore.getState().addChat({ ...chat, updatedAt: 1234 })
  expect(useChatStore.getState().chats[chat.id].updatedAt).toBe(1234)
})
