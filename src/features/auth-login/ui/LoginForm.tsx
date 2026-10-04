import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Button, Callout, Flex, Text, TextField } from '@radix-ui/themes'
import { useMutation } from '@tanstack/react-query'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { describeApiError, getStateInstance, type Credentials } from '@/shared/api'
import { ROUTES } from '@/shared/config'
import { describeInstanceState, validateLogin, type LoginValues } from '../model/validate'

export function LoginForm() {
  const login = useSessionStore((state) => state.login)
  const navigate = useNavigate()
  const [values, setValues] = useState<LoginValues>({ idInstance: '', apiTokenInstance: '' })
  const [error, setError] = useState<string | null>(null)
  const check = useMutation({
    mutationFn: (credentials: Credentials) => getStateInstance(credentials),
  })

  const update = (field: keyof LoginValues) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setError(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateLogin(values)
    if (validationError) {
      setError(validationError)
      return
    }
    const credentials: Credentials = {
      idInstance: values.idInstance.trim(),
      apiTokenInstance: values.apiTokenInstance.trim(),
    }
    check.mutate(credentials, {
      onSuccess: ({ stateInstance }) => {
        const stateError = describeInstanceState(stateInstance)
        if (stateError) {
          setError(stateError)
          return
        }
        login(credentials)
        navigate(ROUTES.home, { replace: true })
      },
      onError: (requestError) => setError(describeApiError(requestError)),
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Flex direction="column" gap="4">
        <label>
          <Text as="div" size="2" weight="medium" mb="1">
            idInstance
          </Text>
          <TextField.Root
            size="3"
            inputMode="numeric"
            autoComplete="username"
            placeholder="1101000001"
            value={values.idInstance}
            onChange={update('idInstance')}
            autoFocus
          />
        </label>
        <label>
          <Text as="div" size="2" weight="medium" mb="1">
            apiTokenInstance
          </Text>
          <TextField.Root
            size="3"
            type="password"
            autoComplete="current-password"
            placeholder="Токен из консоли GREEN-API"
            value={values.apiTokenInstance}
            onChange={update('apiTokenInstance')}
          />
        </label>
        {error && (
          <Callout.Root color="red" role="alert">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}
        <Button type="submit" size="3" loading={check.isPending}>
          Войти
        </Button>
      </Flex>
    </form>
  )
}
