import { ApiError } from './errors'
import {
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

const config = vi.hoisted(() => ({
  GREEN_API_URL: 'https://api.test',
  RECEIVE_TIMEOUT_SEC: 20,
}))
vi.mock('@/shared/config', () => config)

const creds = { idInstance: '1101000001', apiTokenInstance: 'tok/en' }
const fetchMock = vi.fn()

function respond(status: number, body: string) {
  fetchMock.mockResolvedValueOnce(new Response(body, { status }))
}

beforeEach(() => {
  config.GREEN_API_URL = 'https://api.test'
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GREEN-API client', () => {
  it('sendMessage posts JSON to the instance URL', async () => {
    respond(200, '{"idMessage":"42"}')
    await expect(
      sendMessage(creds, { chatId: '79876543210@c.us', message: 'Hi' }),
    ).resolves.toEqual({ idMessage: '42' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.test/waInstance1101000001/sendMessage/tok%2Fen')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ chatId: '79876543210@c.us', message: 'Hi' })
  })

  it('receiveNotification passes receiveTimeout and signal', async () => {
    respond(200, '{"receiptId":1,"body":{"typeWebhook":"x","timestamp":1}}')
    const controller = new AbortController()
    const result = await receiveNotification(creds, controller.signal)
    expect(result?.receiptId).toBe(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://api.test/waInstance1101000001/receiveNotification/tok%2Fen?receiveTimeout=20',
    )
    expect(init.method).toBe('GET')
  })

  it('receiveNotification is cancelled by the caller signal while in flight', async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
        ),
    )
    const controller = new AbortController()
    const pending = receiveNotification(creds, controller.signal).catch((e: unknown) => e)
    controller.abort(new DOMException('Aborted', 'AbortError'))
    expect(await pending).toMatchObject({ name: 'AbortError' })
  })

  it('receiveNotification gives up on a hung connection after the long-poll window', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
        ),
    )
    const pending = receiveNotification(creds).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(31_000)
    const error = await pending
    vi.useRealTimers()
    expect(error).toBeInstanceOf(DOMException)
  })

  it.each(['', 'null', '  '])(
    'receiveNotification returns null for empty body %j',
    async (body) => {
      respond(200, body)
      await expect(receiveNotification(creds)).resolves.toBeNull()
    },
  )

  it('deleteNotification sends DELETE with receiptId', async () => {
    respond(200, '{"result":true}')
    await deleteNotification(creds, 1234567)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.test/waInstance1101000001/deleteNotification/tok%2Fen/1234567')
    expect(init.method).toBe('DELETE')
  })

  it('getStateInstance and checkAccount return parsed JSON', async () => {
    respond(200, '{"stateInstance":"authorized"}')
    await expect(getStateInstance(creds)).resolves.toEqual({ stateInstance: 'authorized' })
    respond(200, '{"exist":true,"chatId":"10000000"}')
    await expect(checkAccount(creds, 79876543210)).resolves.toEqual({
      exist: true,
      chatId: '10000000',
    })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ phoneNumber: 79876543210 })
  })

  it('getChatHistory posts chatId and count', async () => {
    respond(200, '[{"type":"incoming","idMessage":"1","timestamp":1,"typeMessage":"textMessage"}]')
    await expect(getChatHistory(creds, '10000000')).resolves.toHaveLength(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.test/waInstance1101000001/getChatHistory/tok%2Fen')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ chatId: '10000000', count: 100 })
  })

  it('getChatHistory returns an empty list for an empty body', async () => {
    respond(200, '')
    await expect(getChatHistory(creds, '10000000', 5)).resolves.toEqual([])
  })

  it('getChats requests the chat list with a signal', async () => {
    respond(200, '[{"chatId":"10","name":"Vasya"}]')
    const controller = new AbortController()
    await expect(getChats(creds, controller.signal)).resolves.toEqual([
      { chatId: '10', name: 'Vasya' },
    ])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.test/waInstance1101000001/getChats/tok%2Fen')
    expect(init.signal).toBe(controller.signal)
  })

  it('journal methods pass the minutes window', async () => {
    respond(200, '[]')
    respond(200, '')
    await expect(lastIncomingMessages(creds, 60)).resolves.toEqual([])
    await expect(lastOutgoingMessages(creds, 60)).resolves.toEqual([])
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.test/waInstance1101000001/lastIncomingMessages/tok%2Fen?minutes=60',
    )
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.test/waInstance1101000001/lastOutgoingMessages/tok%2Fen?minutes=60',
    )
  })

  it('throws ApiError with status and body on non-2xx', async () => {
    respond(401, 'Unauthorized')
    const error = await getStateInstance(creds).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401, message: 'Unauthorized' })
  })

  it('throws ApiError(0) without calling fetch when API URL is missing', async () => {
    config.GREEN_API_URL = ''
    const error = await getStateInstance(creds).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws ApiError for a non-JSON 200 response', async () => {
    respond(200, '<html>proxy page</html>')
    const error = await getStateInstance(creds).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 200 })
  })

  it('throws when a required response is empty', async () => {
    respond(200, '')
    await expect(getStateInstance(creds)).rejects.toBeInstanceOf(ApiError)
  })
})
