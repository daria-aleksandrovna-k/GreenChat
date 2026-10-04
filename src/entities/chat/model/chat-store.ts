import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { syncAcrossTabs } from '@/shared/lib'
import type { Chat, NewChat } from './types'

interface ChatState {
  chats: Record<string, Chat>
  activeChatId: string | null
  addChat: (chat: NewChat) => void
  setActive: (chatId: string | null) => void
  setTgChatId: (chatId: string, tgChatId: string) => void
  touch: (chatId: string, text: string, timestamp: number, direction: 'in' | 'out') => void
  reset: () => void
}

/** v0 → v1: adds the lastMessageAt field */
function migrateChats(persisted: unknown, version: number): Pick<ChatState, 'chats'> {
  const chats = (persisted as Partial<ChatState> | undefined)?.chats ?? {}
  if (version >= 1) return { chats }
  return {
    chats: Object.fromEntries(
      Object.entries(chats).map(([id, chat]) => [
        id,
        { ...chat, lastMessageAt: chat.lastMessage ? chat.updatedAt : null },
      ]),
    ),
  }
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      chats: {},
      activeChatId: null,

      addChat: (chat) =>
        set((state) =>
          state.chats[chat.id]
            ? state
            : {
                chats: {
                  ...state.chats,
                  [chat.id]: {
                    ...chat,
                    unread: 0,
                    lastMessage: null,
                    lastMessageAt: null,
                    updatedAt: chat.updatedAt ?? Date.now(),
                  },
                },
              },
        ),

      setActive: (chatId) =>
        set((state) => {
          const chat = chatId ? state.chats[chatId] : undefined
          if (!chat || chat.unread === 0) return { activeChatId: chatId }
          return {
            activeChatId: chatId,
            chats: { ...state.chats, [chat.id]: { ...chat, unread: 0 } },
          }
        }),

      setTgChatId: (chatId, tgChatId) =>
        set((state) => {
          const chat = state.chats[chatId]
          if (!chat) return state
          return { chats: { ...state.chats, [chatId]: { ...chat, tgChatId } } }
        }),

      touch: (chatId, text, timestamp, direction) =>
        set((state) => {
          const chat = state.chats[chatId]
          if (!chat) return state
          const isUnread = direction === 'in' && state.activeChatId !== chatId
          // The preview is the newest message: an older one (e.g. from history) does not replace it
          const isNewest = timestamp >= (chat.lastMessageAt ?? 0)
          return {
            chats: {
              ...state.chats,
              [chatId]: {
                ...chat,
                lastMessage: isNewest ? text : chat.lastMessage,
                lastMessageAt: isNewest ? timestamp : chat.lastMessageAt,
                updatedAt: Math.max(chat.updatedAt, timestamp),
                unread: isUnread ? chat.unread + 1 : chat.unread,
              },
            },
          }
        }),

      reset: () => set({ chats: {}, activeChatId: null }),
    }),
    {
      name: 'greenchat-chats',
      version: 1,
      partialize: (state) => ({ chats: state.chats }),
      migrate: (persisted, version) => migrateChats(persisted, version),
    },
  ),
)

syncAcrossTabs(useChatStore)
