import { GREEN_API_URL, RECEIVE_TIMEOUT_SEC } from '@/shared/config'
import { ApiError, INVALID_RESPONSE, MISSING_API_URL } from './errors'
import type {
  ChatInfo,
  CheckAccountResponse,
  Credentials,
  HistoryMessage,
  Notification,
  SendMessageParams,
  SendMessageResponse,
  StateInstanceResponse,
} from './types'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  pathSuffix?: string
  query?: Record<string, string>
  signal?: AbortSignal
  /** Abort the request if there is no response within this time */
  timeoutMs?: number
}

/** A signal that fires on external cancellation or on timeout */
function withTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): { signal: AbortSignal | undefined; clear: () => void } {
  if (timeoutMs === undefined) return { signal, clear: () => {} }
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
    timeoutMs,
  )
  const onAbort = () => controller.abort(signal?.reason)
  if (signal?.aborted) onAbort()
  else signal?.addEventListener('abort', onAbort, { once: true })
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    },
  }
}

async function request<T>(
  credentials: Credentials,
  apiMethod: string,
  options: RequestOptions = {},
): Promise<T | null> {
  if (!GREEN_API_URL) throw new ApiError(MISSING_API_URL, 'VITE_GREEN_API_URL is not set')

  const { idInstance, apiTokenInstance } = credentials
  let url = `${GREEN_API_URL}/waInstance${encodeURIComponent(idInstance)}/${apiMethod}/${encodeURIComponent(apiTokenInstance)}`
  if (options.pathSuffix) url += `/${encodeURIComponent(options.pathSuffix)}`
  if (options.query) url += `?${new URLSearchParams(options.query).toString()}`

  const hasBody = options.body !== undefined
  const timeout = withTimeout(options.signal, options.timeoutMs)
  let response: Response
  let text: string
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: timeout.signal,
    })
    text = await response.text()
  } finally {
    timeout.clear()
  }

  if (!response.ok) throw new ApiError(response.status, text || response.statusText)
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as T | null
  } catch {
    throw new ApiError(response.status, INVALID_RESPONSE)
  }
}

function required<T>(value: T | null, apiMethod: string): T {
  if (value === null) throw new ApiError(500, `Empty response from ${apiMethod}`)
  return value
}

export async function sendMessage(
  credentials: Credentials,
  params: SendMessageParams,
): Promise<SendMessageResponse> {
  const result = await request<SendMessageResponse>(credentials, 'sendMessage', {
    method: 'POST',
    body: params,
  })
  return required(result, 'sendMessage')
}

export function receiveNotification(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<Notification | null> {
  return request<Notification>(credentials, 'receiveNotification', {
    query: { receiveTimeout: String(RECEIVE_TIMEOUT_SEC) },
    signal,
    // The server holds the request up to receiveTimeout; if there is no response well past that (sleep, network change),
    // the connection is stuck: abort it and let the polling loop retry
    timeoutMs: (RECEIVE_TIMEOUT_SEC + 10) * 1000,
  })
}

export async function deleteNotification(
  credentials: Credentials,
  receiptId: number,
): Promise<void> {
  await request(credentials, 'deleteNotification', {
    method: 'DELETE',
    pathSuffix: String(receiptId),
  })
}

export async function getStateInstance(credentials: Credentials): Promise<StateInstanceResponse> {
  const result = await request<StateInstanceResponse>(credentials, 'getStateInstance')
  return required(result, 'getStateInstance')
}

export async function checkAccount(
  credentials: Credentials,
  phoneNumber: number,
): Promise<CheckAccountResponse> {
  const result = await request<CheckAccountResponse>(credentials, 'checkAccount', {
    method: 'POST',
    body: { phoneNumber },
  })
  return required(result, 'checkAccount')
}

export async function getChatHistory(
  credentials: Credentials,
  chatId: string,
  count = 100,
): Promise<HistoryMessage[]> {
  const result = await request<HistoryMessage[]>(credentials, 'getChatHistory', {
    method: 'POST',
    body: { chatId, count },
  })
  return result ?? []
}

export async function getChats(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<ChatInfo[]> {
  return (await request<ChatInfo[]>(credentials, 'getChats', { signal })) ?? []
}

/** Message journals for the last `minutes` minutes: incoming and outgoing */
export async function lastIncomingMessages(
  credentials: Credentials,
  minutes: number,
  signal?: AbortSignal,
): Promise<HistoryMessage[]> {
  const query = { minutes: String(minutes) }
  return (
    (await request<HistoryMessage[]>(credentials, 'lastIncomingMessages', { query, signal })) ?? []
  )
}

export async function lastOutgoingMessages(
  credentials: Credentials,
  minutes: number,
  signal?: AbortSignal,
): Promise<HistoryMessage[]> {
  const query = { minutes: String(minutes) }
  return (
    (await request<HistoryMessage[]>(credentials, 'lastOutgoingMessages', { query, signal })) ?? []
  )
}
