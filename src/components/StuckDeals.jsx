// src/components/StuckDeals.jsx
import { useState } from 'react'
import ActionButton from './ActionButton'
import { triggerAction } from '../api/dashboard'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function buildPayload(deal, farmerName) {
  return {
    dealId: deal.deal_id,
    orgId: deal.org_id,
    orgName: deal.org_name,
    phone: deal.contact?.phone || '',
    email: deal.contact?.email || '',
    farmerName,
  }
}

export default function StuckDeals({ deals, farmerName }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? deals : deals.slice(0, 10)

  if (deals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Nenhum deal parado no período 🎉
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Deal</th>
            <th className="text-left py-2 pr-4">Parceiro</th>
            <th className="text-left py-2 pr-4">Última Atividade</th>
            <th className="text-left py-2 pr-4">Parado há</th>
            <th className="text-left py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(d => (
            <tr key={d.deal_id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 pr-4 font-medium">
                <a
                  href={`https://seazone-fd92b9.pipedrive.com/deal/${d.deal_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {d.deal_title}
                </a>
              </td>
              <td className="py-3 pr-4 text-gray-600">
                <a
                  href={`https://seazone-fd92b9.pipedrive.com/organization/${d.org_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-600 hover:underline"
                >
                  {d.org_name}
                </a>
              </td>
              <td className="py-3 pr-4 text-gray-600">{formatDate(d.ultima_atividade)}</td>
              <td className="py-3 pr-4">
                <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {d.dias_parado} dias
                </span>
              </td>
              <td className="py-3 flex gap-2">
                <ActionButton icon="📞" label="Ligar" action={() => triggerAction('call', buildPayload(d, farmerName))} />
                <ActionButton icon="💬" label="WhatsApp" action={() => triggerAction('whatsapp', buildPayload(d, farmerName))} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {deals.length > 10 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          {showAll ? 'Ver menos ▲' : `Ver mais ${deals.length - 10} deals ▼`}
        </button>
      )}
    </div>
  )
}
