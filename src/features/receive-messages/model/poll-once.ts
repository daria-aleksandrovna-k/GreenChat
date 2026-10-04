import { useSessionStore } from '@/entities/session'
import {
  ApiError,
  deleteNotification,
  receiveNotification,
  type Credentials,
  type Notification,
} from '@/shared/api'
import { parseIncomingText } from '../lib/parse-incoming'
import { applyIncoming } from './apply-incoming'

/** One loop step: receive a notification, handle it, delete it. Returns the receiptId or null. */
export async function pollOnce(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<number | null> {
  let notification: Notification | null
  try {
    notification = await receiveNotification(credentials, signal)
  } catch (error) {
    // 408: the server still holds a previous long-poll (page reload, navigation) and rejects
    // the new one. Nothing is lost; treat it as an empty queue and poll again
    if (error instanceof ApiError && error.status === 408) return null
    throw error
  }
  if (!notification) return null
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
  // While waiting, another tab may have logged out or switched instance: do not write foreign data
  if (useSessionStore.getState().credentials?.idInstance !== credentials.idInstance) {
    throw new DOMException('Session changed', 'AbortError')
  }

  try {
    const incoming = parseIncomingText(notification.body)
    if (incoming) applyIncoming(incoming)
  } catch (error) {
    // Do not block the queue because handling one notification failed
    console.error('Failed to handle notification', error)
  }

  await deleteNotification(credentials, notification.receiptId)
  return notification.receiptId
}
