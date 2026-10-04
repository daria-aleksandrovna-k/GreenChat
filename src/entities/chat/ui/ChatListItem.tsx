import { Avatar, Badge, Text } from '@radix-ui/themes'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/shared/config'
import { formatChatTime, getInitials } from '@/shared/lib'
import type { Chat } from '../model/types'
import styles from './ChatListItem.module.css'

interface ChatListItemProps {
  chat: Chat
  active: boolean
}

export function ChatListItem({ chat, active }: ChatListItemProps) {
  return (
    <Link
      to={ROUTES.chat(chat.id)}
      className={styles.item}
      data-active={active || undefined}
      aria-current={active ? 'page' : undefined}
    >
      <Avatar size="4" radius="full" variant="solid" fallback={getInitials(chat.title)} />
      <div className={styles.body}>
        <div className={styles.row}>
          <Text weight="medium" truncate>
            {chat.title}
          </Text>
          {chat.lastMessageAt !== null && (
            <Text size="1" color="gray" className={styles.time}>
              {formatChatTime(chat.lastMessageAt)}
            </Text>
          )}
        </div>
        <div className={styles.row}>
          <Text size="2" color="gray" truncate>
            {chat.lastMessage ?? 'Нет сообщений'}
          </Text>
          {chat.unread > 0 && (
            <Badge
              radius="full"
              variant="solid"
              className={styles.badge}
              aria-label={`Непрочитанных: ${chat.unread}`}
            >
              {chat.unread}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  )
}
