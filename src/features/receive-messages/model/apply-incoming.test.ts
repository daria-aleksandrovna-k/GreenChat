import { useChatStore } from '@/entities/chat'
import { useMessageStore } from '@/entities/message'
import type { IncomingText } from '../lib/parse-incoming'
import { applyIncoming } from './apply-incoming'

const incoming = (over: Partial<IncomingText> = {}): IncomingText => ({
  idMessage: 'm1',
  tgChatId: '10000000',
  phone: '79998887766',
  senderName: 'Vasilisa',
  text: 'Hello',
  timestamp: 5000,
  ...over,
})

afterEach(() => {
  useChatStore.getState().reset()
  useMessageStore.getState().reset()
})

const messagesOf = (chatId: string) => useMessageStore.getState().byChat[chatId] ?? []

describe('applyIncoming', () => {
  it('matches an existing chat by phone and remembers tgChatId', () => {
    useChatStore.getState().addChat({
      id: '79998887766@c.us',
      phone: '79998887766',
      title: '+79998887766',
      tgChatId: null,
    })
    applyIncoming(incoming())
    const chat = useChatStore.getState().chats['79998887766@c.us']
    expect(chat).toMatchObject({ tgChatId: '10000000', unread: 1, lastMessage: 'Hello' })
    expect(messagesOf('79998887766@c.us')).toEqual([
      expect.objectContaining({ id: 'm1', direction: 'in', status: 'sent', text: 'Hello' }),
    ])
  })

  it('matches by tgChatId even if phone differs', () => {
    useChatStore
      .getState()
      .addChat({ id: '7111@c.us', phone: '7111', title: 'A', tgChatId: '10000000' })
    applyIncoming(incoming({ phone: null }))
    expect(messagesOf('7111@c.us')).toHaveLength(1)
  })

  it('creates a chat for an unknown sender', () => {
    applyIncoming(incoming())
    expect(useChatStore.getState().chats['79998887766@c.us']).toMatchObject({
      title: 'Vasilisa',
      tgChatId: '10000000',
      unread: 1,
    })
  })

  it('creates a chat keyed by tgChatId when phone is hidden', () => {
    applyIncoming(incoming({ phone: null }))
    expect(useChatStore.getState().chats['10000000']).toMatchObject({
      phone: null,
      tgChatId: '10000000',
    })
  })

  it('ignores a redelivered notification', () => {
    applyIncoming(incoming())
    applyIncoming(incoming())
    expect(messagesOf('79998887766@c.us')).toHaveLength(1)
    expect(useChatStore.getState().chats['79998887766@c.us'].unread).toBe(1)
  })

  it('does not count unread for the active chat', () => {
    applyIncoming(incoming())
    useChatStore.getState().setActive('79998887766@c.us')
    applyIncoming(incoming({ idMessage: 'm2' }))
    expect(useChatStore.getState().chats['79998887766@c.us'].unread).toBe(0)
  })
})

describe('reply to a chat created without Telegram id', () => {
  const orphan = { id: '79001112233@c.us', phone: '79001112233', title: 'A', tgChatId: null }
  const outgoing = (chatId: string) => ({
    id: `out-${chatId}`,
    chatId,
    text: 'Hi',
    direction: 'out' as const,
    timestamp: 1000,
    status: 'sent' as const,
  })

  it('attaches the reply to the only chat awaiting a reply', () => {
    useChatStore.getState().addChat(orphan)
    useMessageStore.getState().add(outgoing(orphan.id))
    applyIncoming(incoming({ phone: null }))
    expect(messagesOf(orphan.id)).toHaveLength(2)
    expect(useChatStore.getState().chats['10000000']).toBeUndefined()
  })

  it('does not bind the Telegram id from a guess: replies still go to the phone', () => {
    useChatStore.getState().addChat(orphan)
    useMessageStore.getState().add(outgoing(orphan.id))
    applyIncoming(incoming({ phone: null }))
    expect(useChatStore.getState().chats[orphan.id].tgChatId).toBeNull()
  })

  it('never attaches a sender whose phone is known and different', () => {
    useChatStore.getState().addChat(orphan)
    useMessageStore.getState().add(outgoing(orphan.id))
    applyIncoming(incoming({ phone: '79995555555', tgChatId: '555' }))
    expect(messagesOf(orphan.id)).toHaveLength(1)
    expect(useChatStore.getState().chats[orphan.id].tgChatId).toBeNull()
    expect(useChatStore.getState().chats['79995555555@c.us']).toMatchObject({ tgChatId: '555' })
  })

  it('ignores chats whose outgoing messages were never delivered', () => {
    useChatStore.getState().addChat(orphan)
    useMessageStore.getState().add({ ...outgoing(orphan.id), status: 'error' as const })
    applyIncoming(incoming({ phone: null }))
    expect(messagesOf(orphan.id)).toHaveLength(1)
    expect(useChatStore.getState().chats['10000000']).toBeDefined()
  })

  it('creates a new chat when several chats await a reply', () => {
    const second = { ...orphan, id: '79004445566@c.us', phone: '79004445566' }
    for (const chat of [orphan, second]) {
      useChatStore.getState().addChat(chat)
      useMessageStore.getState().add(outgoing(chat.id))
    }
    applyIncoming(incoming({ phone: null }))
    expect(useChatStore.getState().chats['10000000']).toBeDefined()
  })

  it('does not attach to a chat without outgoing messages', () => {
    useChatStore.getState().addChat(orphan)
    applyIncoming(incoming({ phone: null }))
    expect(useChatStore.getState().chats['10000000']).toBeDefined()
    expect(messagesOf(orphan.id)).toHaveLength(0)
  })
})
