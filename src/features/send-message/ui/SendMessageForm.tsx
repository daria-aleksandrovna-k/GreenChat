import { PaperPlaneIcon } from '@radix-ui/react-icons'
import { IconButton } from '@radix-ui/themes'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { MESSAGE_MAX_LENGTH } from '@/shared/config'
import styles from './SendMessageForm.module.css'

const COUNTER_THRESHOLD = 200

interface SendMessageFormProps {
  onSend: (text: string) => void
}

export function SendMessageForm({ onSend }: SendMessageFormProps) {
  const [text, setText] = useState('')
  const trimmed = text.trim()
  const remaining = MESSAGE_MAX_LENGTH - text.length

  const submit = () => {
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // keyCode 229: Safari sends it for the Enter that commits IME input, with isComposing = false
    const composing = event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229
    if (event.key !== 'Enter' || event.shiftKey || composing) return
    event.preventDefault()
    submit()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <textarea
          className={styles.input}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение"
          aria-label="Текст сообщения"
          rows={1}
          maxLength={MESSAGE_MAX_LENGTH}
          autoFocus
        />
        {remaining <= COUNTER_THRESHOLD && (
          <span className={styles.counter} aria-live="polite">
            {remaining}
          </span>
        )}
      </div>
      <IconButton
        type="submit"
        size="4"
        radius="full"
        disabled={!trimmed}
        aria-label="Отправить"
        className={styles.send}
      >
        <PaperPlaneIcon width={22} height={22} />
      </IconButton>
    </form>
  )
}
