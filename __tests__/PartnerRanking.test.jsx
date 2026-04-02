// __tests__/PartnerRanking.test.jsx
import { render, screen } from '@testing-library/react'
import PartnerRanking from '../src/components/PartnerRanking'

const ranking = [
  { parceiro: 'Myside Imóveis', org_id: '1', total_indicacoes: '78', total_ganhos: '12', conversao_pct: '15.4', ultima_indicacao: '2025-03-01T00:00:00Z' },
  { parceiro: 'FLN Investimentos', org_id: '2', total_indicacoes: '8', total_ganhos: '1', conversao_pct: '12.5', ultima_indicacao: '2025-02-15T00:00:00Z' },
]

it('renderiza ranking com indicações, ganhos e conversão', () => {
  render(<PartnerRanking ranking={ranking} />)
  expect(screen.getByText('Myside Imóveis')).toBeInTheDocument()
  expect(screen.getByText('78')).toBeInTheDocument()
  expect(screen.getByText('15.4%')).toBeInTheDocument()
  expect(screen.getByText('12')).toBeInTheDocument()
})

it('mostra mensagem quando não há ranking', () => {
  render(<PartnerRanking ranking={[]} />)
  expect(screen.getByText(/nenhuma indicação/i)).toBeInTheDocument()
})
