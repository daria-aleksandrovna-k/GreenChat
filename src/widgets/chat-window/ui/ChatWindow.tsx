import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { Avatar, Button, IconButton, Text } from '@radix-ui/themes'
import { Fragment, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useChatHistory } from '@/features/load-history'
import { SendMessageForm, useSendMessage } from '@/features/send-message'
import { useChatStore, type Chat } from '@/entities/chat'
import { MessageBubble, selectChatMessages, useMessageStore } from '@/entities/message'
import { ROUTES } from '@/shared/config'
import { formatDayLabel, formatPhone, getInitials, isSameDay } from '@/shared/lib'
import styles from './ChatWindow.module.css'

interface ChatWindowProps {
  chatId: string
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const chat = useChatStore((state) => state.chats[chatId])
  if (!chat) {
    return (
      <div className={styles.missing}>
        <Text>Чат не найден</Text>
        <Button asChild variant="soft">
          <Link to={ROUTES.home}>К списку чатов</Link>
        </Button>
      </div>
    )
  }
  return <Conversation key={chat.id} chat={chat} />
}

function Conversation({ chat }: { chat: Chat }) {
  const messages = useMessageStore(selectChatMessages(chat.id))
  const { send, retry } = useSendMessage(chat)
  const history = useChatHistory(chat)
  const endRef = useRef<HTMLDivElement>(null)
  const phone = chat.phone ? formatPhone(chat.phone) : null

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages.length, chat.id])

  return (
    <section className={styles.window} aria-label={`Чат: ${chat.title}`}>
      <header className={styles.header}>
        <IconButton asChild variant="ghost" color="gray" size="3" className={styles.back}>
          <Link to={ROUTES.home} aria-label="Назад к списку чатов">
            <ArrowLeftIcon width={20} height={20} />
          </Link>
        </IconButton>
        <Avatar size="3" radius="full" variant="solid" fallback={getInitials(chat.title)} />
        <div className={styles.headerText}>
          <Text weight="medium" truncate>
            {chat.title}
          </Text>
          {phone && phone !== chat.title && (
            <Text size="1" color="gray">
              {phone}
            </Text>
          )}
        </div>
      </header>

      <div className={styles.messages} role="log" aria-live="polite" aria-label="Сообщения">
        <div className={styles.messagesInner}>
          {history.isLoading && <div className={styles.notice}>Загрузка истории…</div>}
          {history.error && !history.isLoading && (
            <div className={styles.notice} role="status">
              Не удалось загрузить историю
            </div>
          )}
          {messages.length === 0 && !history.isLoading && (
            <div className={styles.placeholder}>Сообщений пока нет</div>
          )}
          {messages.map((message, index) => {
            const previous = messages[index - 1]
            const startsDay = !previous || !isSameDay(previous.timestamp, message.timestamp)
            return (
              <Fragment key={message.id}>
                {startsDay && (
                  <div className={styles.day} role="separator">
                    {formatDayLabel(message.timestamp)}
                  </div>
                )}
                <MessageBubble message={message} onRetry={retry} />
              </Fragment>
            )
          })}
          <div ref={endRef} />
        </div>
      </div>

      <div className={styles.composer}>
        <SendMessageForm key={chat.id} onSend={send} />
      </div>
    </section>
  )
}
