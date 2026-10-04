import { cleanup, render, screen } from '@testing-library/react'
import { useSessionStore } from '@/entities/session'
import { App } from './App'

afterEach(() => {
  cleanup()
  useSessionStore.getState().logout()
  window.history.pushState({}, '', '/')
})

describe('App', () => {
  it('redirects a guest to the login page', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Войти' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('opens the chat page for a signed-in user', async () => {
    useSessionStore.getState().login({ idInstance: '1', apiTokenInstance: 't' })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Новый чат' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})
