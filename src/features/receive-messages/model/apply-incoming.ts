import { findChatForSender, useChatStore, type Chat } from '@/entities/chat'
import { useMessageStore } from '@/entities/message'
import { toChatId } from '@/shared/lib'
import type { IncomingText } from '../lib/parse-incoming'

/**
 * A chat created without a Telegram id (checkAccount found no account) that already has a delivered message.
 * If there is exactly one such chat, a reply from a sender with a hidden number is almost certainly for it.
 */
function findChatAwaitingReply(): Chat | undefined {
  const { byChat } = useMessageStore.getState()
  const candidates = Object.values(useChatStore.getState().chats).filter(
    (chat) =>
      chat.tgChatId === null &&
      (byChat[chat.id] ?? []).some(
        (message) => message.direction === 'out' && message.status === 'sent',
      ),
  )
  return candidates.length === 1 ? candidates[0] : undefined
}

export function applyIncoming(incoming: IncomingText): void {
  const chatStore = useChatStore.getState()
  const matched = findChatForSender(Object.values(chatStore.chats), incoming)
  // Guess only for a sender with a hidden number: a known, different number is certainly someone else
  const guessed = !matched && incoming.phone === null ? findChatAwaitingReply() : undefined

  let chatId: string
  if (matched) {
    chatId = matched.id
    if (matched.tgChatId !== incoming.tgChatId) chatStore.setTgChatId(chatId, incoming.tgChatId)
  } else if (guessed) {
    // Do not bind the Telegram id from a guess: sending keeps going to the chat's phone number
    chatId = guessed.id
  } else {
    chatId = incoming.phone ? toChatId(incoming.phone) : incoming.tgChatId
    chatStore.addChat({
      id: chatId,
      phone: incoming.phone,
      title: incoming.senderName,
      tgChatId: incoming.tgChatId,
    })
  }

  const added = useMessageStore.getState().add({
    id: incoming.idMessage,
    chatId,
    text: incoming.text,
    direction: 'in',
    timestamp: incoming.timestamp,
    status: 'sent',
  })
  if (added) useChatStore.getState().touch(chatId, incoming.text, incoming.timestamp, 'in')
}
