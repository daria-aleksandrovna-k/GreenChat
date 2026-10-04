import { useQuery } from '@tanstack/react-query'
import { findChatForSender, useChatStore } from '@/entities/chat'
import { useSessionStore } from '@/entities/session'
import {
  RATE_LIMIT_RETRY_MS,
  getChats,
  lastIncomingMessages,
  lastOutgoingMessages,
  type Credentials,
  retryOnceOnRateLimit,
  type HistoryMessage,
} from '@/shared/api'
import { toChatId } from '@/shared/lib'
import { buildServerChats, type ServerChat } from '../lib/build-server-chats'

const JOURNAL_MINUTES = 30 * 24 * 60
const GET_CHATS_TIMEOUT_MS = 30_000

/** getChats sometimes hangs on the server, so limit the wait */
const timeoutSignal = (): AbortSignal | undefined =>
  typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(GET_CHATS_TIMEOUT_MS) : undefined

async function loadJournal(credentials: Credentials): Promise<HistoryMessage[]> {
  // Journals only provide names and previews: their failure must not block loading the list
  const results = await Promise.allSettled([
    lastIncomingMessages(credentials, JOURNAL_MINUTES),
    lastOutgoingMessages(credentials, JOURNAL_MINUTES),
  ])
  return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
}

function applyServerChats(serverChats: ServerChat[]): void {
  for (const serverChat of serverChats) {
    const store = useChatStore.getState()
    const existing = findChatForSender(Object.values(store.chats), serverChat)
    let chatId: string
    if (existing) {
      chatId = existing.id
      if (existing.tgChatId !== serverChat.tgChatId) {
        store.setTgChatId(chatId, serverChat.tgChatId)
      }
    } else {
      chatId = serverChat.phone ? toChatId(serverChat.phone) : serverChat.tgChatId
      store.addChat({
        id: chatId,
        phone: serverChat.phone,
        title: serverChat.title,
        tgChatId: serverChat.tgChatId,
        // Not "now": otherwise on a new device the chat order would depend on load time
        updatedAt: serverChat.lastMessageAt ?? 0,
      })
    }
    if (serverChat.lastMessage !== null && serverChat.lastMessageAt !== null) {
      // 'out' updates the preview but not the unread counter
      useChatStore.getState().touch(chatId, serverChat.lastMessage, serverChat.lastMessageAt, 'out')
    }
  }
}

/** Loads the account's chat list from the server: needed when signing in on a new device */
export function useSyncChats(): { isLoading: boolean; error: Error | null } {
  const credentials = useSessionStore((state) => state.credentials)

  const { isFetching, error } = useQuery({
    queryKey: ['sync-chats', credentials?.idInstance],
    // The query signal is not used: otherwise a remount (StrictMode, fast navigation)
    // cancels the request and sends a new one, while GREEN-API allows 1 request per second per method
    queryFn: async () => {
      if (!credentials) throw new Error('Not authorized')
      const [chats, journal] = await Promise.all([
        getChats(credentials, timeoutSignal()),
        loadJournal(credentials),
      ])
      const serverChats = buildServerChats(chats, journal)
      applyServerChats(serverChats)
      return serverChats.length
    },
    enabled: credentials !== null,
    staleTime: Infinity,
    retry: retryOnceOnRateLimit,
    retryDelay: RATE_LIMIT_RETRY_MS,
    refetchOnWindowFocus: false,
  })

  return { isLoading: isFetching, error }
}
