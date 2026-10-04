import type { ChatInfo, HistoryMessage } from '@/shared/api'
import { formatPhone } from '@/shared/lib'

export interface ServerChat {
  tgChatId: string
  phone: string | null
  title: string
  lastMessage: string | null
  lastMessageAt: number | null
}

const PERSONAL_TYPES = new Set(['user', 'bot'])

// chatId is documented as a string, but do not trust the format: one malformed entry must not break the list
const chatIdOf = (chat: { chatId?: unknown }): string => String(chat.chatId ?? '')

const isPersonal = (chat: ChatInfo): boolean => {
  const chatId = chatIdOf(chat)
  return (
    chatId !== '' &&
    !chatId.startsWith('-') &&
    (chat.type === undefined || PERSONAL_TYPES.has(chat.type))
  )
}

function messageText(message: HistoryMessage): string | undefined {
  if (message.typeMessage === 'textMessage') return message.textMessage
  if (message.typeMessage === 'extendedTextMessage') {
    return message.extendedTextMessage?.text ?? message.textMessage
  }
  return undefined
}

/**
 * Personal chats of the account from the server. getChats often returns an empty name, so the name
 * and preview are filled in from the incoming and outgoing message journals.
 */
export function buildServerChats(chats: ChatInfo[], journal: HistoryMessage[]): ServerChat[] {
  return chats.filter(isPersonal).map((chat) => {
    const chatId = chatIdOf(chat)
    const messages = journal
      .filter((message) => chatIdOf(message) === chatId)
      .sort((a, b) => b.timestamp - a.timestamp)
    const senderName = messages.find((message) => message.senderName)?.senderName
    const newest = messages.find((message) => messageText(message))
    const phone = chat.phoneNumber ? String(chat.phoneNumber) : null

    return {
      tgChatId: chatId,
      phone,
      title:
        chat.name || senderName || chat.username || (phone ? formatPhone(phone) : `Чат ${chatId}`),
      lastMessage: newest ? (messageText(newest) ?? null) : null,
      lastMessageAt: newest ? newest.timestamp * 1000 : null,
    }
  })
}
