// src/App.jsx
import FarmerFilter from './components/FarmerFilter'
import SummaryCards from './components/SummaryCards'
import InactivePartners from './components/InactivePartners'
import StuckDeals from './components/StuckDeals'
import PartnerRanking from './components/PartnerRanking'
import { useDashboardData } from './hooks/useDashboardData'

function Section({ title, badge, badgeColor, children }) {
  const colors = {
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
        {badge != null && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-10 bg-gray-100 rounded-lg" />
      ))}
    </div>
  )
}

export default function App() {
  const {
    farmers, selectedFarmer, setSelectedFarmer,
    stuckDays, setStuckDays,
    data, loading, error, refresh,
  } = useDashboardData()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Farmers Dashboard</h1>
          <span className="text-xs text-gray-400">Seazone Parcerias</span>
        </div>

        <FarmerFilter
          farmers={farmers}
          selectedFarmer={selectedFarmer}
          onFarmerChange={setSelectedFarmer}
          stuckDays={stuckDays}
          onStuckDaysChange={setStuckDays}
          onRefresh={refresh}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-3">
            ⚠️ {error}
          </div>
        )}

        <SummaryCards
          inactivePartners={data.inactivePartners}
          stuckDeals={data.stuckDeals}
          partnerRanking={data.partnerRanking}
        />

        <Section title="⚠️ Parceiros Inativos" badge={data.inactivePartners.length} badgeColor="red">
          {loading ? <Skeleton /> : (
            <InactivePartners partners={data.inactivePartners} farmerName={selectedFarmer} />
          )}
        </Section>

        <Section title="⏸ Deals Parados" badge={data.stuckDeals.length} badgeColor="yellow">
          {loading ? <Skeleton /> : (
            <StuckDeals deals={data.stuckDeals} farmerName={selectedFarmer} />
          )}
        </Section>

        <Section title="🏆 Ranking de Parceiros" badge={data.partnerRanking.length} badgeColor="blue">
          {loading ? <Skeleton /> : (
            <PartnerRanking ranking={data.partnerRanking} />
          )}
        </Section>

      </div>
    </div>
  )
}
