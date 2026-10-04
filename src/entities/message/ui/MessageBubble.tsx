import { CheckIcon, ClockIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { formatTime } from '@/shared/lib'
import type { Message, MessageStatus } from '../model/types'
import styles from './MessageBubble.module.css'

const STATUS_LABEL: Record<MessageStatus, string> = {
  sending: 'Отправляется',
  sent: 'Отправлено',
  error: 'Не отправлено',
}

function StatusIcon({ status }: { status: MessageStatus }) {
  const Icon =
    status === 'sending' ? ClockIcon : status === 'sent' ? CheckIcon : ExclamationTriangleIcon
  return (
    <span
      role="img"
      aria-label={STATUS_LABEL[status]}
      className={styles.status}
      data-status={status}
    >
      <Icon width={14} height={14} aria-hidden />
    </span>
  )
}

interface MessageBubbleProps {
  message: Message
  onRetry?: (message: Message) => void
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const outgoing = message.direction === 'out'
  return (
    <div className={styles.row} data-direction={message.direction}>
      <div
        className={styles.bubble}
        data-direction={message.direction}
        data-status={message.status}
      >
        <span className={styles.text}>{message.text}</span>
        <span className={styles.meta}>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {outgoing && <StatusIcon status={message.status} />}
        </span>
      </div>
      {outgoing && message.status === 'error' && onRetry && (
        <button
          type="button"
          className={styles.retry}
          title={message.error}
          onClick={() => onRetry(message)}
        >
          Не отправлено{message.error ? `: ${message.error}` : ''}. Повторить
        </button>
      )}
    </div>
  )
}
