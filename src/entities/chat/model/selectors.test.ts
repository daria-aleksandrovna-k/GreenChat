import type { Chat } from './types'
import { findChatForSender, getSendTarget, sortChats } from './selectors'

const make = (over: Partial<Chat>): Chat => ({
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

describe('findChatForSender', () => {
  const byTg = make({ id: 'a@c.us', phone: '111', tgChatId: '10' })
  const byPhone = make({ id: 'b@c.us', phone: '79998887766' })

  it('prefers Telegram chat id', () => {
    expect(findChatForSender([byPhone, byTg], { tgChatId: '10', phone: '79998887766' })).toBe(byTg)
  })
  it('falls back to phone', () => {
    expect(findChatForSender([byTg, byPhone], { tgChatId: '20', phone: '79998887766' })).toBe(
      byPhone,
    )
  })
  it('returns undefined when nothing matches or phone is unknown', () => {
    expect(findChatForSender([byTg, byPhone], { tgChatId: '20', phone: null })).toBeUndefined()
  })
})

it('getSendTarget prefers tgChatId', () => {
  expect(getSendTarget(make({ id: '7@c.us', tgChatId: '10' }))).toBe('10')
  expect(getSendTarget(make({ id: '7@c.us' }))).toBe('7@c.us')
})

it('sortChats orders by last message time, then by creation time', () => {
  const old = make({ id: 'old', lastMessageAt: 1_000, updatedAt: 9_000 })
  const recent = make({ id: 'recent', lastMessageAt: 5_000, updatedAt: 5_000 })
  const fresh = make({ id: 'fresh', lastMessageAt: null, updatedAt: 7_000 })
  expect(sortChats({ old, recent, fresh }).map((c) => c.id)).toEqual(['fresh', 'recent', 'old'])
})

it('sortChats orders by updatedAt desc', () => {
  const a = make({ id: 'a', updatedAt: 1 })
  const b = make({ id: 'b', updatedAt: 2 })
  expect(sortChats({ a, b }).map((c) => c.id)).toEqual(['b', 'a'])
})
