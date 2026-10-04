import type { Message } from './types'
import { failPendingMessages, selectChatMessages, useMessageStore } from './message-store'

const msg = (over: Partial<Message>): Message => ({
  id: '1',
  chatId: 'c',
  text: 'hi',
  direction: 'in',
  timestamp: 1000,
  status: 'sent',
  ...over,
})

afterEach(() => useMessageStore.getState().reset())

describe('message store', () => {
  it('adds messages, ignoring duplicates by id', () => {
    const store = useMessageStore.getState()
    expect(store.add(msg({}))).toBe(true)
    expect(store.add(msg({ text: 'dup' }))).toBe(false)
    expect(selectChatMessages('c')(useMessageStore.getState())).toHaveLength(1)
  })

  it('keeps messages ordered by timestamp', () => {
    const store = useMessageStore.getState()
    store.add(msg({ id: 'b', timestamp: 2000 }))
    store.add(msg({ id: 'a', timestamp: 1000 }))
    expect(selectChatMessages('c')(useMessageStore.getState()).map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('updates status and error', () => {
    const store = useMessageStore.getState()
    store.add(msg({ id: 'o', direction: 'out', status: 'sending' }))
    store.update('c', 'o', { status: 'error', error: 'fail' })
    expect(selectChatMessages('c')(useMessageStore.getState())[0]).toMatchObject({
      status: 'error',
      error: 'fail',
    })
  })

  it('returns a stable empty array for unknown chats', () => {
    const state = useMessageStore.getState()
    expect(selectChatMessages('none')(state)).toBe(selectChatMessages('other')(state))
  })
})

describe('failPendingMessages', () => {
  it('turns interrupted sending messages into errors', () => {
    const result = failPendingMessages({
      c: [msg({ id: 's', status: 'sending' }), msg({ id: 'ok' })],
    })
    expect(result.c[0]).toMatchObject({ status: 'error' })
    expect(result.c[0].error).toContain('Статус неизвестен')
    expect(result.c[1].status).toBe('sent')
  })
})

describe('cross-tab sync', () => {
  it('picks up messages from another tab without failing its pending sends', async () => {
    const pending = msg({ id: 'p', direction: 'out', status: 'sending' })
    const newValue = JSON.stringify({ state: { byChat: { c: [pending] } }, version: 0 })
    localStorage.setItem('greenchat-messages', newValue)
    window.dispatchEvent(new StorageEvent('storage', { key: 'greenchat-messages', newValue }))
    await vi.waitFor(() =>
      expect(selectChatMessages('c')(useMessageStore.getState())[0]?.status).toBe('sending'),
    )
  })
})

describe('mergeHistory', () => {
  it('adds only missing messages and keeps order', () => {
    const store = useMessageStore.getState()
    store.add(msg({ id: 'b', timestamp: 2000 }))
    const added = store.mergeHistory('c', [
      msg({ id: 'a', timestamp: 1000 }),
      msg({ id: 'b', timestamp: 2000, text: 'dup' }),
      msg({ id: 'c', timestamp: 3000 }),
    ])
    expect(added).toBe(2)
    const list = selectChatMessages('c')(useMessageStore.getState())
    expect(list.map((m) => m.id)).toEqual(['a', 'b', 'c'])
    expect(list[1].text).toBe('hi')
  })

  it('skips outgoing messages already known by serverId', () => {
    const store = useMessageStore.getState()
    store.add(msg({ id: 'local-1', direction: 'out', status: 'sending' }))
    store.update('c', 'local-1', { status: 'sent', serverId: '1791150266031' })
    expect(store.mergeHistory('c', [msg({ id: '1791150266031', direction: 'out' })])).toBe(0)
    expect(selectChatMessages('c')(useMessageStore.getState())).toHaveLength(1)
  })

  it('returns 0 and keeps state when nothing is new', () => {
    const store = useMessageStore.getState()
    store.add(msg({}))
    const before = useMessageStore.getState().byChat
    expect(store.mergeHistory('c', [msg({})])).toBe(0)
    expect(useMessageStore.getState().byChat).toBe(before)
  })
})

describe('server time from history', () => {
  it('replaces the local timestamp of a sent message with the server one', () => {
    const store = useMessageStore.getState()
    store.add(msg({ id: 'local-1', direction: 'out', timestamp: 9000, status: 'sending' }))
    store.add(msg({ id: 'in-1', timestamp: 8000 }))
    store.update('c', 'local-1', { status: 'sent', serverId: 's1' })
    store.mergeHistory('c', [msg({ id: 's1', direction: 'out', timestamp: 7000 })])
    const list = selectChatMessages('c')(useMessageStore.getState())
    expect(list.map((m) => [m.id, m.timestamp])).toEqual([
      ['local-1', 7000],
      ['in-1', 8000],
    ])
  })
})

it('persists with version 1', () => {
  useMessageStore.getState().add(msg({}))
  expect(localStorage.getItem('greenchat-messages')).toContain('"version":1')
})

it('drops the history copy of a message once its send is confirmed', () => {
  const store = useMessageStore.getState()
  store.add(msg({ id: 'local-1', direction: 'out', status: 'sending', timestamp: 5000 }))
  // History loaded before the sendMessage response arrived
  store.mergeHistory('c', [msg({ id: 's1', direction: 'out', timestamp: 4990 })])
  store.update('c', 'local-1', { status: 'sent', serverId: 's1' })
  const list = selectChatMessages('c')(useMessageStore.getState())
  expect(list.map((m) => m.id)).toEqual(['local-1'])
})
