import { useSessionStore } from '@/entities/session'
import { ApiError, deleteNotification, receiveNotification } from '@/shared/api'
import { applyIncoming } from './apply-incoming'
import { pollOnce } from './poll-once'

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  receiveNotification: vi.fn(),
  deleteNotification: vi.fn(),
}))
vi.mock('./apply-incoming', () => ({ applyIncoming: vi.fn() }))

const creds = { idInstance: '1', apiTokenInstance: 't' }
const textBody = {
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1,
  idMessage: 'm1',
  senderData: { chatId: '10', senderPhoneNumber: 79990000000 },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Hi' } },
}

beforeEach(() => {
  vi.mocked(deleteNotification).mockResolvedValue(undefined)
  useSessionStore.getState().login(creds)
})
afterEach(() => {
  useSessionStore.getState().logout()
  vi.clearAllMocks()
})

describe('pollOnce', () => {
  it('returns null when the queue is empty', async () => {
    vi.mocked(receiveNotification).mockResolvedValue(null)
    await expect(pollOnce(creds)).resolves.toBeNull()
    expect(deleteNotification).not.toHaveBeenCalled()
  })

  it('treats a 408 from a superseded long-poll as an empty queue', async () => {
    vi.mocked(receiveNotification).mockRejectedValue(new ApiError(408, ''))
    await expect(pollOnce(creds)).resolves.toBeNull()
    expect(deleteNotification).not.toHaveBeenCalled()
  })

  it('still reports other API errors', async () => {
    vi.mocked(receiveNotification).mockRejectedValue(new ApiError(500, 'boom'))
    await expect(pollOnce(creds)).rejects.toMatchObject({ status: 500 })
  })

  it('applies a text message and deletes the notification', async () => {
    vi.mocked(receiveNotification).mockResolvedValue({ receiptId: 7, body: textBody })
    await expect(pollOnce(creds)).resolves.toBe(7)
    expect(applyIncoming).toHaveBeenCalledWith(expect.objectContaining({ text: 'Hi' }))
    expect(deleteNotification).toHaveBeenCalledWith(creds, 7)
  })

  it('only deletes other notifications', async () => {
    vi.mocked(receiveNotification).mockResolvedValue({
      receiptId: 8,
      body: { typeWebhook: 'outgoingMessageStatus', timestamp: 1 },
    })
    await pollOnce(creds)
    expect(applyIncoming).not.toHaveBeenCalled()
    expect(deleteNotification).toHaveBeenCalledWith(creds, 8)
  })

  it('still deletes when applying fails', async () => {
    vi.mocked(receiveNotification).mockResolvedValue({ receiptId: 9, body: textBody })
    vi.mocked(applyIncoming).mockImplementationOnce(() => {
      throw new Error('bug')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await pollOnce(creds)
    expect(deleteNotification).toHaveBeenCalledWith(creds, 9)
  })

  it('still deletes a malformed notification', async () => {
    vi.mocked(receiveNotification).mockResolvedValue({
      receiptId: 11,
      body: { ...textBody, senderData: {} as typeof textBody.senderData },
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await pollOnce(creds)
    expect(deleteNotification).toHaveBeenCalledWith(creds, 11)
  })

  it('does not apply or delete when the user logged out in another tab meanwhile', async () => {
    vi.mocked(receiveNotification).mockImplementation(async () => {
      useSessionStore.getState().logout()
      return { receiptId: 12, body: textBody }
    })
    await expect(pollOnce(creds)).rejects.toBeDefined()
    expect(applyIncoming).not.toHaveBeenCalled()
    expect(deleteNotification).not.toHaveBeenCalled()
  })

  it('does not apply or delete when aborted after receiving', async () => {
    const controller = new AbortController()
    vi.mocked(receiveNotification).mockImplementation(async () => {
      controller.abort()
      return { receiptId: 10, body: textBody }
    })
    await expect(pollOnce(creds, controller.signal)).rejects.toBeDefined()
    expect(applyIncoming).not.toHaveBeenCalled()
    expect(deleteNotification).not.toHaveBeenCalled()
  })
})
