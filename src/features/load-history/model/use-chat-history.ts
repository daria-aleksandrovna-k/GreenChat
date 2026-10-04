import { useQuery } from '@tanstack/react-query'
import { useChatStore, type Chat } from '@/entities/chat'
import { useMessageStore } from '@/entities/message'
import { useSessionStore } from '@/entities/session'
import { getChatHistory, RATE_LIMIT_RETRY_MS, retryOnceOnRateLimit } from '@/shared/api'
import { mapHistory } from '../lib/map-history'

/** Loads the chat history from the server when a chat opens and merges it with local messages without duplicates */
export function useChatHistory(chat: Chat): { isLoading: boolean; error: Error | null } {
  const credentials = useSessionStore((state) => state.credentials)
  // The phone@c.us format is not documented for getChatHistory, so request by Telegram id only
  const target = chat.tgChatId

  const { isFetching, error } = useQuery({
    queryKey: ['history', chat.id, target],
    queryFn: async () => {
      if (!credentials || !target) throw new Error('Not authorized')
      const messages = mapHistory(chat.id, await getChatHistory(credentials, target))
      useMessageStore.getState().mergeHistory(chat.id, messages)

      // The preview is the newest chat message; update it if that message came from history.
      // Direction 'out' so the unread counter does not grow
      const newest = useMessageStore.getState().byChat[chat.id]?.at(-1)
      if (newest && messages.some((message) => message.id === newest.id)) {
        useChatStore.getState().touch(chat.id, newest.text, newest.timestamp, 'out')
      }
      return messages.length
    },
    enabled: credentials !== null && target !== null,
    retry: retryOnceOnRateLimit,
    retryDelay: RATE_LIMIT_RETRY_MS,
    // New messages arrive via polling, so history is not re-requested when quickly returning to a chat
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  return { isLoading: isFetching, error }
}
