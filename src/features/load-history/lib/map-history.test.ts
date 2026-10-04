import type { HistoryMessage } from '@/shared/api'
import { mapHistory } from './map-history'

const item = (over: Partial<HistoryMessage>): HistoryMessage => ({
  type: 'incoming',
  idMessage: '1',
  timestamp: 100,
  typeMessage: 'textMessage',
  chatId: '10',
  textMessage: 'Hello',
  ...over,
})

describe('mapHistory', () => {
  it('maps text messages to chat messages sorted by time', () => {
    const result = mapHistory('7999@c.us', [
      item({ idMessage: '2', type: 'outgoing', timestamp: 200, textMessage: 'Hi' }),
      item({ idMessage: '1', timestamp: 100 }),
    ])
    expect(result).toEqual([
      {
        id: '1',
        chatId: '7999@c.us',
        text: 'Hello',
        direction: 'in',
        timestamp: 100000,
        status: 'sent',
      },
      {
        id: '2',
        chatId: '7999@c.us',
        text: 'Hi',
        direction: 'out',
        timestamp: 200000,
        status: 'sent',
      },
    ])
  })

  it('reads text of extendedTextMessage', () => {
    const result = mapHistory('c', [
      item({
        typeMessage: 'extendedTextMessage',
        textMessage: undefined,
        extendedTextMessage: { text: 'https://green-api.com' },
      }),
    ])
    expect(result[0].text).toBe('https://green-api.com')
  })

  it('skips media and empty messages', () => {
    expect(
      mapHistory('c', [
        item({ typeMessage: 'imageMessage', textMessage: undefined }),
        item({ textMessage: '' }),
      ]),
    ).toEqual([])
  })
})
