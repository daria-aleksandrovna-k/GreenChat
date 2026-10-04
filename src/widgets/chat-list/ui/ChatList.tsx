import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Button, Callout, Flex, Heading, Spinner, Text } from '@radix-ui/themes'
import { useMemo } from 'react'
import { LogoutButton, useLogout } from '@/features/auth-login'
import { CreateChatDialog } from '@/features/create-chat'
import { ChatListItem, sortChats, useChatStore } from '@/entities/chat'
import { describeApiError, isAuthError } from '@/shared/api'
import styles from './ChatList.module.css'

interface ChatListProps {
  pollError: Error | null
  /** The chat list is being loaded from the server */
  syncing: boolean
  syncError: Error | null
}

export function ChatList({ pollError, syncing, syncError }: ChatListProps) {
  const chatsById = useChatStore((state) => state.chats)
  const activeChatId = useChatStore((state) => state.activeChatId)
  const chats = useMemo(() => sortChats(chatsById), [chatsById])
  const logout = useLogout()

  return (
    <aside className={styles.sidebar} aria-label="Чаты">
      <header className={styles.header}>
        <Heading as="h1" size="4">
          GreenChat
        </Heading>
        <Flex gap="4" align="center">
          <CreateChatDialog />
          <LogoutButton />
        </Flex>
      </header>

      {pollError && (
        <Callout.Root color="red" size="1" mx="3" mb="2" role="alert">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {describeApiError(pollError)}
            {isAuthError(pollError) ? '. ' : '. Повторяем подключение…'}
          </Callout.Text>
          {isAuthError(pollError) && (
            <Button size="1" variant="soft" color="red" onClick={logout}>
              Выйти и ввести другие данные
            </Button>
          )}
        </Callout.Root>
      )}

      {syncing && (
        <Flex className={styles.status} align="center" justify="center" gap="2" role="status">
          <Spinner size="2" />
          <Text size="2" color="gray">
            Загрузка чатов…
          </Text>
        </Flex>
      )}

      {syncError && !syncing && (
        <Text as="p" size="1" color="gray" className={styles.status}>
          Не удалось загрузить чаты с сервера: {describeApiError(syncError)}
        </Text>
      )}

      {chats.length === 0 && syncing ? null : chats.length === 0 ? (
        <div className={styles.empty}>
          <Text size="2" color="gray" align="center">
            Чатов пока нет. Нажмите на значок карандаша, чтобы написать по номеру телефона
          </Text>
        </div>
      ) : (
        <nav className={styles.scroll} aria-label="Список чатов">
          <ul className={styles.list}>
            {chats.map((chat) => (
              <li key={chat.id}>
                <ChatListItem chat={chat} active={chat.id === activeChatId} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  )
}
