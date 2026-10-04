import type { ChatInfo, HistoryMessage } from '@/shared/api'
import { buildServerChats } from './build-server-chats'

const msg = (over: Partial<HistoryMessage>): HistoryMessage => ({
  type: 'incoming',
  idMessage: '1',
  timestamp: 100,
  typeMessage: 'textMessage',
  chatId: '10',
  textMessage: 'Hello',
  ...over,
})

describe('buildServerChats', () => {
  it('keeps personal chats and drops groups', () => {
    const chats: ChatInfo[] = [
      { chatId: '10', name: 'Vasya', type: 'user', phoneNumber: 79990001122 },
      { chatId: '-100', name: 'Group', type: 'supergroup' },
      { chatId: '20', name: 'Channel', type: 'channel' },
      { chatId: '30', name: 'No type' },
    ]
    expect(buildServerChats(chats, []).map((c) => c.tgChatId)).toEqual(['10', '30'])
  })

  it('coerces a numeric chatId and skips entries without one', () => {
    const chats = [{ chatId: 10 as unknown as string, name: 'Vasya' }, {} as ChatInfo]
    expect(buildServerChats(chats, [msg({ chatId: '10' })])).toMatchObject([
      { tgChatId: '10', title: 'Vasya', lastMessage: 'Hello' },
    ])
  })

  it('maps phone and title', () => {
    expect(
      buildServerChats([{ chatId: '10', name: 'Vasya', phoneNumber: 79990001122 }], []),
    ).toEqual([
      {
        tgChatId: '10',
        phone: '79990001122',
        title: 'Vasya',
        lastMessage: null,
        lastMessageAt: null,
      },
    ])
  })

  it('falls back to the journal sender name, username, phone and chat id', () => {
    const result = buildServerChats(
      [
        { chatId: '10', name: '', phoneNumber: 0 },
        { chatId: '20', name: '', username: '@petya' },
        { chatId: '30', name: '', phoneNumber: 79990001122 },
        { chatId: '40' },
      ],
      [msg({ chatId: '10', senderName: 'Daria Kovaleva' })],
    )
    expect(result.map((c) => c.title)).toEqual([
      'Daria Kovaleva',
      '@petya',
      '+79990001122',
      'Чат 40',
    ])
  })

  it('takes the newest text message from both journals as preview', () => {
    const [chat] = buildServerChats(
      [{ chatId: '10', name: 'Vasya' }],
      [
        msg({ idMessage: 'a', timestamp: 100, textMessage: 'old' }),
        msg({ idMessage: 'b', type: 'outgoing', timestamp: 300, textMessage: 'newest' }),
        msg({
          idMessage: 'c',
          timestamp: 400,
          typeMessage: 'imageMessage',
          textMessage: undefined,
        }),
        msg({ idMessage: 'd', chatId: '99', timestamp: 999, textMessage: 'other chat' }),
      ],
    )
    expect(chat).toMatchObject({ lastMessage: 'newest', lastMessageAt: 300_000 })
  })
})
