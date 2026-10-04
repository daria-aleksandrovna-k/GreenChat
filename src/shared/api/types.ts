export interface Credentials {
  idInstance: string
  apiTokenInstance: string
}

export type InstanceState =
  | 'authorized'
  | 'notAuthorized'
  | 'blocked'
  | 'suspended'
  | 'starting'
  | 'pendingPassword'
  | (string & {})

export interface StateInstanceResponse {
  stateInstance: InstanceState
}

export interface SendMessageParams {
  chatId: string
  message: string
}

export interface SendMessageResponse {
  idMessage: string
}

export interface CheckAccountResponse {
  exist: boolean
  chatId?: string
  username?: string
  phoneNumber?: number
}

export interface SenderData {
  chatId: string
  chatName?: string
  chatType?: string
  sender?: string
  senderName?: string
  senderContactName?: string
  senderPhoneNumber?: number
}

export interface MessageData {
  typeMessage: string
  textMessageData?: { textMessage: string }
  extendedTextMessageData?: { text: string }
}

export interface NotificationBody {
  typeWebhook: string
  timestamp: number
  idMessage?: string
  senderData?: SenderData
  messageData?: MessageData
}

export interface Notification {
  receiptId: number
  body: NotificationBody
}

export interface HistoryMessage {
  type: 'incoming' | 'outgoing' | (string & {})
  idMessage: string
  timestamp: number
  typeMessage: string
  chatId: string
  textMessage?: string
  extendedTextMessage?: { text?: string }
  statusMessage?: string
  senderName?: string
  chatType?: string
}

export interface ChatInfo {
  chatId: string
  name?: string
  type?: string
  phoneNumber?: number
  username?: string
}
