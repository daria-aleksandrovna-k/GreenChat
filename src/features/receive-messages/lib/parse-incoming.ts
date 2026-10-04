import type { NotificationBody } from '@/shared/api'
import { formatPhone, normalizePhone } from '@/shared/lib'

export interface IncomingText {
  idMessage: string
  tgChatId: string
  phone: string | null
  senderName: string
  text: string
  timestamp: number
}

function extractText(body: NotificationBody): string | undefined {
  const data = body.messageData
  if (data?.typeMessage === 'textMessage') return data.textMessageData?.textMessage
  if (data?.typeMessage === 'extendedTextMessage') return data.extendedTextMessageData?.text
  return undefined
}

export function parseIncomingText(body: NotificationBody): IncomingText | null {
  if (body.typeWebhook !== 'incomingMessageReceived') return null
  const sender = body.senderData
  // chatId is documented as a string, but do not trust the format: a malformed notification must not break the loop
  const tgChatId = String(sender?.chatId ?? '')
  if (!sender || !body.idMessage || !tgChatId || tgChatId.startsWith('-')) return null

  const text = extractText(body)
  if (!text) return null

  const phone = sender.senderPhoneNumber ? normalizePhone(String(sender.senderPhoneNumber)) : ''
  const senderName =
    sender.senderContactName ||
    sender.senderName ||
    sender.chatName ||
    (phone ? formatPhone(phone) : tgChatId)

  return {
    idMessage: body.idMessage,
    tgChatId,
    phone: phone || null,
    senderName,
    text,
    timestamp: body.timestamp * 1000,
  }
}
