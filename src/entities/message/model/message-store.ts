import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { syncAcrossTabs } from '@/shared/lib'
import type { Message, MessageStatus } from './types'

const EMPTY: Message[] = []

let initialHydrationDone = false

const PENDING_INTERRUPTED =
  'Статус неизвестен: страница перезагрузилась во время отправки. Повтор может отправить дубль'

interface MessageState {
  byChat: Record<string, Message[]>
  add: (message: Message) => boolean
  update: (
    chatId: string,
    messageId: string,
    patch: { status: MessageStatus; error?: string; serverId?: string },
  ) => void
  /** Adds history messages that are not known yet (by id or serverId). Returns the number added */
  mergeHistory: (chatId: string, messages: Message[]) => number
  reset: () => void
}

export function failPendingMessages(byChat: Record<string, Message[]>): Record<string, Message[]> {
  return Object.fromEntries(
    Object.entries(byChat).map(([chatId, messages]) => [
      chatId,
      messages.map((message) =>
        message.status === 'sending'
          ? { ...message, status: 'error' as const, error: PENDING_INTERRUPTED }
          : message,
      ),
    ]),
  )
}

export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      byChat: {},

      add: (message) => {
        const list = get().byChat[message.chatId] ?? EMPTY
        if (list.some((existing) => existing.id === message.id)) return false
        const next = [...list, message].sort((a, b) => a.timestamp - b.timestamp)
        set((state) => ({ byChat: { ...state.byChat, [message.chatId]: next } }))
        return true
      },

      update: (chatId, messageId, patch) =>
        set((state) => {
          const list = state.byChat[chatId]
          if (!list) return state
          // History may have loaded before the sendMessage response: its copy of this message is a duplicate.
          // Drop the copy and move its server timestamp to the local message
          const historyCopy = patch.serverId
            ? list.find((message) => message.id === patch.serverId)
            : undefined
          const next = list
            .filter((message) => message !== historyCopy)
            .map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    ...patch,
                    timestamp: historyCopy?.timestamp ?? message.timestamp,
                  }
                : message,
            )
          if (historyCopy) next.sort((a, b) => a.timestamp - b.timestamp)
          return { byChat: { ...state.byChat, [chatId]: next } }
        }),

      mergeHistory: (chatId, messages) => {
        const list = get().byChat[chatId] ?? EMPTY
        const byServerId = new Map(messages.map((message) => [message.id, message]))
        let retimed = false
        // Outgoing messages store local time; take the server time from history so order does not depend on the browser clock
        const updated = list.map((message) => {
          const fromServer = message.serverId ? byServerId.get(message.serverId) : undefined
          if (!fromServer || fromServer.timestamp === message.timestamp) return message
          retimed = true
          return { ...message, timestamp: fromServer.timestamp }
        })
        const known = new Set(list.flatMap((message) => [message.id, message.serverId ?? '']))
        const fresh = messages.filter((message) => !known.has(message.id))
        if (fresh.length === 0 && !retimed) return 0
        const next = [...updated, ...fresh].sort((a, b) => a.timestamp - b.timestamp)
        set((state) => ({ byChat: { ...state.byChat, [chatId]: next } }))
        return fresh.length
      },

      reset: () => set({ byChat: {} }),
    }),
    {
      name: 'greenchat-messages',
      version: 1,
      migrate: (persisted) => persisted as Pick<MessageState, 'byChat'>,
      partialize: (state) => ({ byChat: state.byChat }),
      merge: (persisted, current) => {
        const byChat = (persisted as Partial<MessageState> | undefined)?.byChat ?? {}
        // Mark unfinished sends as failed only on page load;
        // when syncing from another tab, its sends are still in flight
        const isInitialLoad = !initialHydrationDone
        initialHydrationDone = true
        return { ...current, byChat: isInitialLoad ? failPendingMessages(byChat) : byChat }
      },
    },
  ),
)

export const selectChatMessages =
  (chatId: string) =>
  (state: MessageState): Message[] =>
    state.byChat[chatId] ?? EMPTY

syncAcrossTabs(useMessageStore)
