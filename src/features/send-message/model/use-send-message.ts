import { useMutation } from '@tanstack/react-query'
import { useCallback } from 'react'
import { getSendTarget, useChatStore, type Chat } from '@/entities/chat'
import { useMessageStore, type Message } from '@/entities/message'
import { useSessionStore } from '@/entities/session'
import { describeApiError, sendMessage } from '@/shared/api'
import { createLocalId } from '@/shared/lib'

interface SendVariables {
  chatId: string
  target: string
  messageId: string
  text: string
}

export function useSendMessage(chat: Chat) {
  const credentials = useSessionStore((state) => state.credentials)

  // The chat is passed in variables, not a closure: TanStack updates options of an in-flight mutation,
  // so after switching chats the callbacks would otherwise update the wrong chat
  const { mutate } = useMutation({
    mutationFn: ({ target, text }: SendVariables) => {
      if (!credentials) throw new Error('Not authorized')
      return sendMessage(credentials, { chatId: target, message: text })
    },
    onMutate: ({ chatId, messageId }) =>
      useMessageStore.getState().update(chatId, messageId, { status: 'sending', error: undefined }),
    onSuccess: ({ idMessage }, { chatId, messageId }) =>
      useMessageStore.getState().update(chatId, messageId, { status: 'sent', serverId: idMessage }),
    onError: (error, { chatId, messageId }) =>
      useMessageStore
        .getState()
        .update(chatId, messageId, { status: 'error', error: describeApiError(error) }),
  })

  const target = getSendTarget(chat)

  const send = useCallback(
    (text: string) => {
      const messageId = createLocalId()
      const timestamp = Date.now()
      useMessageStore.getState().add({
        id: messageId,
        chatId: chat.id,
        text,
        direction: 'out',
        timestamp,
        status: 'sending',
      })
      useChatStore.getState().touch(chat.id, text, timestamp, 'out')
      mutate({ chatId: chat.id, target, messageId, text })
    },
    [chat.id, target, mutate],
  )

  const retry = useCallback(
    (message: Message) =>
      mutate({ chatId: message.chatId, target, messageId: message.id, text: message.text }),
    [target, mutate],
  )

  return { send, retry }
}
