// __tests__/StuckDeals.test.jsx
import { render, screen } from '@testing-library/react'
import StuckDeals from '../src/components/StuckDeals'

const deals = [
  {
    deal_id: '123', deal_title: 'Lead Myside',
    org_id: '1', org_name: 'Myside Imóveis',
    ultima_atividade: '2025-03-20T00:00:00Z', dias_parado: '13',
    contact: { phone: '+5547999999999', email: 'myside@test.com' },
  },
]

it('renderiza deals parados com dias e ações', () => {
  render(<StuckDeals deals={deals} farmerName="Luana" />)
  expect(screen.getByText('Lead Myside')).toBeInTheDocument()
  expect(screen.getByText('Myside Imóveis')).toBeInTheDocument()
  expect(screen.getByText('13 dias')).toBeInTheDocument()
  expect(screen.getAllByRole('button')).toHaveLength(3)
})

it('mostra mensagem vazia quando não há deals parados', () => {
  render(<StuckDeals deals={[]} farmerName="Luana" />)
  expect(screen.getByText(/nenhum deal parado/i)).toBeInTheDocument()
})
