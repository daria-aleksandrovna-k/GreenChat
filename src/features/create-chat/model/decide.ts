import type { Chat } from '@/entities/chat'
import type { CheckAccountResponse } from '@/shared/api'
import { formatPhone } from '@/shared/lib'

export type CreateChatDecision =
  | { type: 'open'; chatId: string }
  | { type: 'create'; tgChatId: string; title: string }
  | { type: 'not-found' }

export const findChatByPhone = (chats: Chat[], digits: string): Chat | undefined =>
  chats.find((chat) => chat.phone === digits)

export function decideAfterCheck(
  chats: Chat[],
  digits: string,
  result: CheckAccountResponse,
): CreateChatDecision {
  const tgChatId = String(result.chatId ?? '')
  if (!result.exist || !tgChatId) return { type: 'not-found' }
  const existing = chats.find((chat) => chat.tgChatId === tgChatId)
  if (existing) return { type: 'open', chatId: existing.id }
  return { type: 'create', tgChatId, title: result.username || formatPhone(digits) }
}
