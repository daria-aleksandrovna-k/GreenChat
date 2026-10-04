import { Theme } from '@radix-ui/themes'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SendMessageForm } from './SendMessageForm'

function setup() {
  const onSend = vi.fn()
  render(
    <Theme>
      <SendMessageForm onSend={onSend} />
    </Theme>,
  )
  return { onSend, input: screen.getByLabelText('Текст сообщения') as HTMLTextAreaElement }
}

describe('SendMessageForm', () => {
  it('sends trimmed text on Enter and clears the field', async () => {
    const { onSend, input } = setup()
    await userEvent.type(input, '  Привет  {Enter}')
    expect(onSend).toHaveBeenCalledWith('Привет')
    expect(input.value).toBe('')
  })

  it('inserts a newline on Shift+Enter without sending', async () => {
    const { onSend, input } = setup()
    await userEvent.type(input, 'a{Shift>}{Enter}{/Shift}b')
    expect(onSend).not.toHaveBeenCalled()
    expect(input.value).toBe('a\nb')
  })

  it('blocks whitespace-only messages', async () => {
    const { onSend, input } = setup()
    await userEvent.type(input, '   {Enter}')
    expect(onSend).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled()
  })

  it('does not send while IME composition is active', () => {
    const { onSend, input } = setup()
    fireEvent.change(input, { target: { value: 'こんにちは' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('does not send on the Enter that commits IME composition in Safari', () => {
    const { onSend, input } = setup()
    fireEvent.change(input, { target: { value: 'こんにちは' } })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('sends with the button', async () => {
    const { onSend, input } = setup()
    await userEvent.type(input, 'Hi')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }))
    expect(onSend).toHaveBeenCalledWith('Hi')
  })
})
