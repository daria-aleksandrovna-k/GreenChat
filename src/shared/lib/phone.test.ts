import { formatPhone, isValidPhone, normalizePhone, toChatId } from './phone'

describe('normalizePhone', () => {
  it('keeps only digits', () => {
    expect(normalizePhone('+7 (987) 654-32-10')).toBe('79876543210')
  })
  it('returns empty string when there are no digits', () => {
    expect(normalizePhone(' +() - ')).toBe('')
  })
})

describe('isValidPhone', () => {
  it.each(['7987654321', '79876543210', '123456789012345'])('accepts %s', (digits) => {
    expect(isValidPhone(digits)).toBe(true)
  })
  it.each(['', '123456789', '1234567890123456', '7987a654321'])('rejects %s', (digits) => {
    expect(isValidPhone(digits)).toBe(false)
  })
})

describe('toChatId / formatPhone', () => {
  it('builds GREEN-API chat id', () => {
    expect(toChatId('79876543210')).toBe('79876543210@c.us')
  })
  it('formats phone with plus', () => {
    expect(formatPhone('79876543210')).toBe('+79876543210')
  })
})
