import { getInitials } from './initials'

describe('getInitials', () => {
  it('takes first letters of two words', () => {
    expect(getInitials('vasilisa the wise')).toBe('VT')
  })
  it('handles one word and phone numbers', () => {
    expect(getInitials('Иван')).toBe('И')
    expect(getInitials('+79876543210')).toBe('7')
  })
  it('falls back to question mark', () => {
    expect(getInitials('  ')).toBe('?')
  })
})
