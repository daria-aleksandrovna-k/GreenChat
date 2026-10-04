import type { Chat, SenderRef } from './types'

export function findChatForSender(chats: Chat[], sender: SenderRef): Chat | undefined {
  const byTelegramId = chats.find((chat) => chat.tgChatId === sender.tgChatId)
  if (byTelegramId) return byTelegramId
  if (!sender.phone) return undefined
  return chats.find((chat) => chat.phone === sender.phone)
}

export const getSendTarget = (chat: Chat): string => chat.tgChatId ?? chat.id

/** A chat without messages sorts by creation time, otherwise by its last message */
const sortKey = (chat: Chat): number => chat.lastMessageAt ?? chat.updatedAt

export const sortChats = (chats: Record<string, Chat>): Chat[] =>
  Object.values(chats).sort((a, b) => sortKey(b) - sortKey(a))
