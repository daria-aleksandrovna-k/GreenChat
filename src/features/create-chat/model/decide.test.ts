import type { Chat } from '@/entities/chat'
import { decideAfterCheck, findChatByPhone } from './decide'

const chat = (over: Partial<Chat>): Chat => ({
  id: 'x',
  phone: null,
  title: 'x',
  tgChatId: null,
  unread: 0,
  lastMessage: null,
  lastMessageAt: null,
  updatedAt: 0,
  ...over,
})

describe('findChatByPhone', () => {
  it('finds a chat with the same phone', () => {
    const existing = chat({ id: '7999@c.us', phone: '7999' })
    expect(findChatByPhone([existing], '7999')).toBe(existing)
    expect(findChatByPhone([existing], '7000')).toBeUndefined()
  })
})

describe('decideAfterCheck', () => {
  it('creates a chat with tgChatId and username title', () => {
    expect(
      decideAfterCheck([], '79876543210', { exist: true, chatId: '10', username: '@vasya' }),
    ).toEqual({ type: 'create', tgChatId: '10', title: '@vasya' })
  })

  it('uses formatted phone as title without username', () => {
    expect(decideAfterCheck([], '79876543210', { exist: true, chatId: '10' })).toEqual({
      type: 'create',
      tgChatId: '10',
      title: '+79876543210',
    })
  })

  it('opens an existing chat with the same Telegram id', () => {
    const existing = chat({ id: '10', tgChatId: '10' })
    expect(decideAfterCheck([existing], '79876543210', { exist: true, chatId: '10' })).toEqual({
      type: 'open',
      chatId: '10',
    })
  })

  it('coerces a numeric chatId to string', () => {
    const result = { exist: true, chatId: 10 as unknown as string }
    expect(decideAfterCheck([], '79876543210', result)).toMatchObject({ tgChatId: '10' })
  })

  it('reports not found', () => {
    expect(decideAfterCheck([], '79876543210', { exist: false })).toEqual({ type: 'not-found' })
  })
})
