import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ChatList } from '@/widgets/chat-list'
import { ChatWindow } from '@/widgets/chat-window'
import { useReceiveMessages } from '@/features/receive-messages'
import { useSyncChats } from '@/features/sync-chats'
import { useChatStore } from '@/entities/chat'
import styles from './ChatPage.module.css'

export function ChatPage() {
  const { chatId } = useParams<{ chatId?: string }>()
  const { error } = useReceiveMessages()
  const sync = useSyncChats()
  const setActive = useChatStore((state) => state.setActive)

  useEffect(() => {
    setActive(chatId ?? null)
    return () => setActive(null)
  }, [chatId, setActive])

  return (
    <div className={styles.layout} data-chat-open={chatId ? '' : undefined}>
      <div className={styles.sidebar}>
        <ChatList pollError={error} syncing={sync.isLoading} syncError={sync.error} />
      </div>
      <main className={styles.main}>
        {chatId ? (
          <ChatWindow chatId={chatId} />
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyBadge}>Выберите чат или создайте новый</span>
          </div>
        )}
      </main>
    </div>
  )
}
