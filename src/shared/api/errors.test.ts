import {
  ApiError,
  INVALID_RESPONSE,
  MISSING_API_URL,
  describeApiError,
  isAuthError,
} from './errors'

describe('describeApiError', () => {
  it.each([
    [new ApiError(MISSING_API_URL, 'x'), 'VITE_GREEN_API_URL'],
    [new ApiError(401, 'Unauthorized'), 'apiTokenInstance'],
    [new ApiError(403, '<html>Forbidden</html>'), 'idInstance'],
    [new ApiError(429, 'Too Many Requests'), 'Слишком много запросов'],
    [
      new ApiError(400, 'Message cannot be received because custom webhook url is set'),
      'Webhook URL',
    ],
    [new ApiError(400, 'instance is starting or not authorized'), 'не авторизован'],
    [new ApiError(400, 'instance in starting process try later'), 'запускается'],
    [new ApiError(400, 'Instance account is expired'), 'истёк'],
    [new ApiError(500, 'boom'), 'Ошибка GREEN-API (500): boom'],
    [new ApiError(200, INVALID_RESPONSE), 'некорректный ответ'],
    [new TypeError('Failed to fetch'), 'Нет соединения'],
  ])('describes %s', (error, expected) => {
    expect(describeApiError(error)).toContain(expected)
  })
})

describe('describeApiError with HTML error pages', () => {
  const page = '<html><head><title>404 Not Found</title></head><body>nginx</body></html>'

  it('explains 404 as an unknown instance without dumping HTML', () => {
    const text = describeApiError(new ApiError(404, page))
    expect(text).toContain('idInstance')
    expect(text).not.toContain('<')
  })

  it('never shows raw HTML for other statuses', () => {
    const text = describeApiError(new ApiError(502, page))
    expect(text).toBe('Ошибка GREEN-API (502)')
  })
})

describe('isAuthError', () => {
  it('is true only for 401 and 403', () => {
    expect(isAuthError(new ApiError(401, ''))).toBe(true)
    expect(isAuthError(new ApiError(403, ''))).toBe(true)
    expect(isAuthError(new ApiError(400, ''))).toBe(false)
    expect(isAuthError(new Error('x'))).toBe(false)
  })
})
