export type MessageStatus = 'sending' | 'sent' | 'error'

export interface Message {
  id: string
  chatId: string
  text: string
  direction: 'in' | 'out'
  timestamp: number
  status: MessageStatus
  error?: string
  /** idMessage from the sendMessage response, used to match server history */
  serverId?: string
}
