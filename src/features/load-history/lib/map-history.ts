import type { Message } from '@/entities/message'
import type { HistoryMessage } from '@/shared/api'

function extractText(item: HistoryMessage): string | undefined {
  if (item.typeMessage === 'textMessage') return item.textMessage
  if (item.typeMessage === 'extendedTextMessage') {
    return item.extendedTextMessage?.text ?? item.textMessage
  }
  return undefined
}

/** Text messages from GetChatHistory as feed messages, oldest first */
export function mapHistory(chatId: string, items: HistoryMessage[]): Message[] {
  return items
    .flatMap((item): Message[] => {
      const text = extractText(item)
      if (!text || !item.idMessage) return []
      return [
        {
          id: item.idMessage,
          chatId,
          text,
          direction: item.type === 'outgoing' ? 'out' : 'in',
          timestamp: item.timestamp * 1000,
          status: 'sent',
        },
      ]
    })
    .sort((a, b) => a.timestamp - b.timestamp)
}
