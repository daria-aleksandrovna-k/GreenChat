import { selectIsAuthorized, useSessionStore } from './session-store'

const creds = { idInstance: '1', apiTokenInstance: 't' }

afterEach(() => useSessionStore.setState({ credentials: null }))

it('logs in, persists and logs out', () => {
  expect(selectIsAuthorized(useSessionStore.getState())).toBe(false)
  useSessionStore.getState().login(creds)
  expect(selectIsAuthorized(useSessionStore.getState())).toBe(true)
  expect(localStorage.getItem('greenchat-session')).toContain('"idInstance":"1"')
  expect(localStorage.getItem('greenchat-session')).toContain('"version":1')
  useSessionStore.getState().logout()
  expect(useSessionStore.getState().credentials).toBeNull()
})

it('logs out when another tab logs out', async () => {
  useSessionStore.getState().login(creds)
  const newValue = JSON.stringify({ state: { credentials: null }, version: 0 })
  localStorage.setItem('greenchat-session', newValue)
  window.dispatchEvent(new StorageEvent('storage', { key: 'greenchat-session', newValue }))
  await vi.waitFor(() => expect(useSessionStore.getState().credentials).toBeNull())
})
