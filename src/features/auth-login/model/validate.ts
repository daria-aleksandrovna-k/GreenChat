import type { InstanceState } from '@/shared/api'

export interface LoginValues {
  idInstance: string
  apiTokenInstance: string
}

export function validateLogin(values: LoginValues): string | null {
  const idInstance = values.idInstance.trim()
  if (!idInstance || !values.apiTokenInstance.trim()) return 'Заполните оба поля'
  if (!/^\d+$/.test(idInstance)) return 'idInstance должен состоять только из цифр'
  return null
}

export function describeInstanceState(state: InstanceState): string | null {
  switch (state) {
    case 'authorized':
      return null
    case 'notAuthorized':
      return 'Инстанс не авторизован. Отсканируйте QR-код в консоли GREEN-API'
    case 'pendingPassword':
      return 'Инстанс ожидает пароль двухфакторной аутентификации. Завершите авторизацию в консоли GREEN-API'
    case 'blocked':
      return 'Аккаунт заблокирован'
    case 'suspended':
      return 'На аккаунт наложены временные ограничения'
    case 'starting':
      return 'Инстанс запускается. Попробуйте через несколько минут'
    default:
      return `Неизвестный статус инстанса: ${state}`
  }
}
