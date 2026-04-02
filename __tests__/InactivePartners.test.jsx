// __tests__/InactivePartners.test.jsx
import { render, screen } from '@testing-library/react'
import InactivePartners from '../src/components/InactivePartners'

const partners = [
  {
    org_id: '1', org_name: 'Myside Imóveis',
    ultima_indicacao: '2025-01-01T00:00:00Z', dias_inativo: '81',
    contact: { phone: '+5547999999999', email: 'myside@test.com' },
  },
  {
    org_id: '2', org_name: 'FLN Investimentos',
    ultima_indicacao: null, dias_inativo: '9999',
    contact: { phone: '', email: '' },
  },
]

it('renderiza lista de parceiros inativos com dias e botões de ação', () => {
  render(<InactivePartners partners={partners} farmerName="Luana" />)
  expect(screen.getByText('Myside Imóveis')).toBeInTheDocument()
  expect(screen.getByText('81 dias')).toBeInTheDocument()
  expect(screen.getByText('FLN Investimentos')).toBeInTheDocument()
  expect(screen.getByText('Nunca')).toBeInTheDocument()
  // 3 botões por parceiro = 6 total
  expect(screen.getAllByRole('button')).toHaveLength(6)
})

it('exibe mensagem quando lista está vazia', () => {
  render(<InactivePartners partners={[]} farmerName="Luana" />)
  expect(screen.getByText(/nenhum parceiro inativo/i)).toBeInTheDocument()
})
