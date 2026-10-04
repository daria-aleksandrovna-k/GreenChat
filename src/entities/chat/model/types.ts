export interface Chat {
  /** "<digits>@c.us" for chats by phone number, or the Telegram chatId for chats without one */
  id: string
  phone: string | null
  title: string
  tgChatId: string | null
  unread: number
  lastMessage: string | null
  /** Time of the last message; null if there are no messages yet */
  lastMessageAt: number | null
  updatedAt: number
}

export type NewChat = Pick<Chat, 'id' | 'phone' | 'title' | 'tgChatId'> & {
  /** Defaults to the creation time; for chats loaded from the server, the last message time */
  updatedAt?: number
}

export interface SenderRef {
  tgChatId: string
  phone: string | null
}
