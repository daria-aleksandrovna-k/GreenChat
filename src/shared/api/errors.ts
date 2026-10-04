export const MISSING_API_URL = 0
export const INVALID_RESPONSE = 'Invalid JSON response'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** GREEN-API rate-limits requests (some methods allow 1 request per second) */
export const RATE_LIMIT_RETRY_MS = 1100

/** For TanStack Query: retry once when the rate limit (429) is hit */
export const retryOnceOnRateLimit = (failureCount: number, error: Error): boolean =>
  failureCount < 1 && error instanceof ApiError && error.status === 429

export const isAuthError = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 401 || error.status === 403)

export function describeApiError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Нет соединения с GREEN-API. Проверьте интернет'
  }
  const text = error.message.toLowerCase()
  if (error.status === MISSING_API_URL) {
    return 'Не задан адрес API: укажите VITE_GREEN_API_URL и пересоберите приложение'
  }
  if (error.message === INVALID_RESPONSE) {
    return 'GREEN-API вернул некорректный ответ. Проверьте адрес API (VITE_GREEN_API_URL)'
  }
  if (error.status === 401) return 'Неверный apiTokenInstance'
  if (error.status === 404) {
    return 'Инстанс не найден. Проверьте idInstance и адрес API (VITE_GREEN_API_URL)'
  }
  if (error.status === 403) return 'Неверный idInstance или адрес API (VITE_GREEN_API_URL)'
  if (error.status === 429) return 'Слишком много запросов. Повторим через несколько секунд'
  if (text.includes('webhook')) {
    return 'В настройках инстанса задан Webhook URL. Очистите его в консоли GREEN-API и подождите около минуты'
  }
  if (text.includes('not authorized')) {
    return 'Инстанс не авторизован. Отсканируйте QR-код в консоли GREEN-API'
  }
  if (text.includes('starting')) return 'Инстанс запускается. Попробуйте через несколько секунд'
  if (text.includes('expired'))
    return 'Срок действия инстанса истёк. Продлите его в консоли GREEN-API'
  // Proxies and nginx respond with an HTML page: never show its text to the user
  const isHtml = /^\s*</.test(error.message)
  if (isHtml || !error.message) return `Ошибка GREEN-API (${error.status})`
  return `Ошибка GREEN-API (${error.status}): ${error.message.slice(0, 200)}`
}
