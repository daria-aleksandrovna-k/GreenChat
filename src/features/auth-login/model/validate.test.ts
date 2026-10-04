import { describeInstanceState, validateLogin } from './validate'

describe('validateLogin', () => {
  it('requires both fields', () => {
    expect(validateLogin({ idInstance: ' ', apiTokenInstance: 'x' })).toBe('Заполните оба поля')
    expect(validateLogin({ idInstance: '1', apiTokenInstance: '' })).toBe('Заполните оба поля')
  })
  it('requires numeric idInstance', () => {
    expect(validateLogin({ idInstance: '11a', apiTokenInstance: 'x' })).toContain('цифр')
  })
  it('accepts valid values with surrounding spaces', () => {
    expect(validateLogin({ idInstance: ' 1101000001 ', apiTokenInstance: ' tok ' })).toBeNull()
  })
})

describe('describeInstanceState', () => {
  it('returns null for authorized', () => {
    expect(describeInstanceState('authorized')).toBeNull()
  })
  it.each([
    ['notAuthorized', 'QR'],
    ['pendingPassword', 'пароль'],
    ['blocked', 'заблокирован'],
    ['suspended', 'ограничения'],
    ['starting', 'запускается'],
    ['weird', 'weird'],
  ])('describes %s', (state, expected) => {
    expect(describeInstanceState(state)).toContain(expected)
  })
})
