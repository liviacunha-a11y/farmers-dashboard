// __tests__/FarmerFilter.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import FarmerFilter from '../src/components/FarmerFilter'

const farmers = ['Luana Schaikoski', 'Raira Cardili']

it('renderiza dropdown com farmers e dispara onChange', () => {
  const onFarmer = vi.fn()
  render(
    <FarmerFilter
      farmers={farmers}
      selectedFarmer="Luana Schaikoski"
      onFarmerChange={onFarmer}
      stuckDays={7}
      onStuckDaysChange={vi.fn()}
      onRefresh={vi.fn()}
    />
  )
  expect(screen.getByRole('combobox')).toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Raira Cardili' } })
  expect(onFarmer).toHaveBeenCalledWith('Raira Cardili')
})

it('dispara onRefresh ao clicar no botão Atualizar', () => {
  const onRefresh = vi.fn()
  render(
    <FarmerFilter
      farmers={farmers}
      selectedFarmer="Luana Schaikoski"
      onFarmerChange={vi.fn()}
      stuckDays={7}
      onStuckDaysChange={vi.fn()}
      onRefresh={onRefresh}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: /atualizar/i }))
  expect(onRefresh).toHaveBeenCalled()
})
