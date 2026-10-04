import type { NotificationBody } from '@/shared/api'
import { parseIncomingText } from './parse-incoming'

const base: NotificationBody = {
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1763115112,
  idMessage: 'm1',
  senderData: {
    chatId: '10000000',
    chatType: 'user',
    senderName: 'Vasilisa the Wise',
    senderContactName: 'Vasilisa',
    senderPhoneNumber: 79998887766,
  },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Hello' } },
}

describe('parseIncomingText', () => {
  it('parses a text message from a personal chat', () => {
    expect(parseIncomingText(base)).toEqual({
      idMessage: 'm1',
      tgChatId: '10000000',
      phone: '79998887766',
      senderName: 'Vasilisa',
      text: 'Hello',
      timestamp: 1763115112000,
    })
  })

  it('parses extendedTextMessage', () => {
    const body = {
      ...base,
      messageData: {
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'See https://green-api.com' },
      },
    }
    expect(parseIncomingText(body)?.text).toBe('See https://green-api.com')
  })

  it('treats zero or missing phone as unknown and falls back to senderName', () => {
    const body = {
      ...base,
      senderData: { chatId: '10000000', senderName: 'Ivan', senderPhoneNumber: 0 },
    }
    expect(parseIncomingText(body)).toMatchObject({ phone: null, senderName: 'Ivan' })
  })

  it('coerces a numeric chatId to string', () => {
    const body = {
      ...base,
      senderData: { ...base.senderData!, chatId: 10000000 as unknown as string },
    }
    expect(parseIncomingText(body)?.tgChatId).toBe('10000000')
  })

  it.each<[string, NotificationBody]>([
    ['missing chatId', { ...base, senderData: {} as NotificationBody['senderData'] }],
    ['outgoing', { ...base, typeWebhook: 'outgoingMessageReceived' }],
    ['status', { typeWebhook: 'outgoingMessageStatus', timestamp: 1 }],
    ['group', { ...base, senderData: { ...base.senderData!, chatId: '-1000000000' } }],
    ['image', { ...base, messageData: { typeMessage: 'imageMessage' } }],
    [
      'empty text',
      {
        ...base,
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: '' } },
      },
    ],
    ['no idMessage', { ...base, idMessage: undefined }],
  ])('ignores %s', (_name, body) => {
    expect(parseIncomingText(body)).toBeNull()
  })
})
