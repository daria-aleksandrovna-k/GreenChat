export {
  checkAccount,
  deleteNotification,
  getChatHistory,
  getChats,
  lastIncomingMessages,
  lastOutgoingMessages,
  getStateInstance,
  receiveNotification,
  sendMessage,
} from './client'
export {
  ApiError,
  INVALID_RESPONSE,
  MISSING_API_URL,
  RATE_LIMIT_RETRY_MS,
  describeApiError,
  retryOnceOnRateLimit,
  isAuthError,
} from './errors'
export type {
  ChatInfo,
  CheckAccountResponse,
  Credentials,
  HistoryMessage,
  InstanceState,
  MessageData,
  Notification,
  NotificationBody,
  SendMessageParams,
  SendMessageResponse,
  SenderData,
  StateInstanceResponse,
} from './types'
