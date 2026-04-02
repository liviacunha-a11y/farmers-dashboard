// __tests__/ActionButton.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ActionButton from '../src/components/ActionButton'

it('mostra loading durante execução e sucesso ao completar', async () => {
  const action = vi.fn().mockResolvedValue({ message: 'Ligação iniciada' })
  render(<ActionButton icon="📞" label="Ligar" action={action} />)

  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByRole('button')).toBeDisabled()

  await waitFor(() => expect(screen.getByTitle('Ligação iniciada')).toBeInTheDocument())
})

it('mostra erro quando ação falha', async () => {
  const action = vi.fn().mockRejectedValue(new Error('api4com timeout'))
  render(<ActionButton icon="📞" label="Ligar" action={action} />)

  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(screen.getByTitle('api4com timeout')).toBeInTheDocument())
})
