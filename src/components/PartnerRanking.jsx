// src/components/PartnerRanking.jsx
function ConversionBar({ pct }) {
  const value = Math.min(Number(pct) || 0, 100)
  const color = value >= 20 ? 'bg-green-500' : value >= 10 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right">{pct}%</span>
    </div>
  )
}

export default function PartnerRanking({ ranking }) {
  if (ranking.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">Nenhuma indicação registrada</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4 w-6">#</th>
            <th className="text-left py-2 pr-4">Parceiro</th>
            <th className="text-right py-2 pr-4">Indicações</th>
            <th className="text-right py-2 pr-4">Ganhos</th>
            <th className="text-left py-2 pr-4 min-w-32">Conversão</th>
            <th className="text-left py-2">Última Indicação</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((p, i) => (
            <tr key={p.org_id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 pr-4 text-gray-400 text-xs">{i + 1}</td>
              <td className="py-3 pr-4 font-medium text-gray-800">{p.parceiro}</td>
              <td className="py-3 pr-4 text-right font-semibold text-blue-600">{p.total_indicacoes}</td>
              <td className="py-3 pr-4 text-right font-semibold text-green-600">{p.total_ganhos}</td>
              <td className="py-3 pr-4"><ConversionBar pct={p.conversao_pct} /></td>
              <td className="py-3 text-gray-500 text-xs">
                {p.ultima_indicacao ? new Date(p.ultima_indicacao).toLocaleDateString('pt-BR') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
