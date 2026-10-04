import { ExclamationTriangleIcon, Pencil2Icon } from '@radix-ui/react-icons'
import { Button, Callout, Dialog, Flex, IconButton, TextField } from '@radix-ui/themes'
import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '@/entities/chat'
import { useSessionStore } from '@/entities/session'
import { checkAccount, describeApiError } from '@/shared/api'
import { ROUTES } from '@/shared/config'
import { formatPhone, isValidPhone, normalizePhone, toChatId } from '@/shared/lib'
import { decideAfterCheck, findChatByPhone } from '../model/decide'

interface Problem {
  text: string
  canForce: boolean
}

export function CreateChatDialog() {
  const credentials = useSessionStore((state) => state.credentials)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [problem, setProblem] = useState<Problem | null>(null)
  const check = useMutation({
    mutationFn: (digits: string) => {
      if (!credentials) throw new Error('Not authorized')
      return checkAccount(credentials, Number(digits))
    },
  })
  const digits = normalizePhone(phone)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setPhone('')
      setProblem(null)
      check.reset()
    }
  }

  const openChat = (chatId: string) => {
    handleOpenChange(false)
    navigate(ROUTES.chat(chatId))
  }

  const createChat = (tgChatId: string | null, title = formatPhone(digits)) => {
    const id = toChatId(digits)
    useChatStore.getState().addChat({ id, phone: digits, title, tgChatId })
    openChat(id)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValidPhone(digits)) {
      setProblem({
        text: 'Введите номер в международном формате: от 10 до 15 цифр',
        canForce: false,
      })
      return
    }
    const chats = Object.values(useChatStore.getState().chats)
    const existing = findChatByPhone(chats, digits)
    if (existing) {
      openChat(existing.id)
      return
    }
    setProblem(null)
    check.mutate(digits, {
      onSuccess: (result) => {
        const decision = decideAfterCheck(chats, digits, result)
        if (decision.type === 'open') openChat(decision.chatId)
        else if (decision.type === 'create') createChat(decision.tgChatId, decision.title)
        else
          setProblem({
            text: 'Аккаунт Telegram с этим номером не найден или номер скрыт настройками приватности',
            canForce: true,
          })
      },
      onError: (error) => setProblem({ text: describeApiError(error), canForce: true }),
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <IconButton variant="ghost" color="gray" size="3" aria-label="Новый чат" title="Новый чат">
          <Pencil2Icon width={20} height={20} />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>Новый чат</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Номер телефона получателя в международном формате
        </Dialog.Description>
        <form onSubmit={handleSubmit} noValidate>
          <Flex direction="column" gap="3">
            <TextField.Root
              size="3"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 987 654-32-10"
              aria-label="Номер телефона"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value)
                setProblem(null)
              }}
              autoFocus
            />
            {problem && (
              <Callout.Root color={problem.canForce ? 'amber' : 'red'} role="alert">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>{problem.text}</Callout.Text>
              </Callout.Root>
            )}
            <Flex gap="3" justify="end" wrap="wrap">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  Отмена
                </Button>
              </Dialog.Close>
              {problem?.canForce && (
                <Button type="button" variant="outline" onClick={() => createChat(null)}>
                  Всё равно создать
                </Button>
              )}
              <Button type="submit" loading={check.isPending}>
                Создать
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}
