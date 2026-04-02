// src/components/SummaryCards.jsx
function Card({ label, value, sub, color }) {
  const colors = {
    red: 'border-red-400 bg-red-50 text-red-700',
    yellow: 'border-yellow-400 bg-yellow-50 text-yellow-700',
    blue: 'border-blue-400 bg-blue-50 text-blue-700',
  }
  return (
    <div className={`border-l-4 rounded-xl p-4 shadow-sm ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  )
}

export default function SummaryCards({ inactivePartners, stuckDeals, partnerRanking }) {
  const topPartner = partnerRanking[0]

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card label="Parceiros Inativos" value={inactivePartners.length} color="red" sub="+30 dias sem indicação" />
      <Card label="Deals Parados" value={stuckDeals.length} color="yellow" sub="sem movimentação" />
      <Card
        label="Top Parceiro"
        value={topPartner?.parceiro?.split(' ').slice(0, 2).join(' ') ?? '—'}
        color="blue"
        sub={topPartner ? `${topPartner.total_indicacoes} indicações` : null}
      />
    </div>
  )
}
