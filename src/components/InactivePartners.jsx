// src/components/InactivePartners.jsx
import ActionButton from './ActionButton'
import { triggerAction } from '../api/dashboard'

function formatDate(dateStr) {
  if (!dateStr) return 'Nunca'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function buildPayload(partner, farmerName) {
  return {
    dealId: null,
    orgId: partner.org_id,
    orgName: partner.org_name,
    phone: partner.contact?.phone || '',
    email: partner.contact?.email || '',
    farmerName,
  }
}

export default function InactivePartners({ partners, farmerName }) {
  if (partners.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Nenhum parceiro inativo no momento 🎉
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Parceiro</th>
            <th className="text-left py-2 pr-4">Última Indicação</th>
            <th className="text-left py-2 pr-4">Inativo há</th>
            <th className="text-left py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {partners.map(p => (
            <tr key={p.org_id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 pr-4 font-medium text-gray-800">{p.org_name}</td>
              <td className="py-3 pr-4 text-gray-600">{formatDate(p.ultima_indicacao)}</td>
              <td className="py-3 pr-4">
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {p.dias_inativo === '9999' ? '∞' : `${p.dias_inativo} dias`}
                </span>
              </td>
              <td className="py-3 flex gap-2">
                <ActionButton icon="📞" label="Ligar" action={() => triggerAction('call', buildPayload(p, farmerName))} />
                <ActionButton icon="💬" label="WhatsApp" action={() => triggerAction('whatsapp', buildPayload(p, farmerName))} />
                <ActionButton icon="📧" label="Email" action={() => triggerAction('email', buildPayload(p, farmerName))} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
