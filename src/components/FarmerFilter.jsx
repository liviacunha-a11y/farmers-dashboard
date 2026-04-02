// src/components/FarmerFilter.jsx
export default function FarmerFilter({ farmers, selectedFarmer, onFarmerChange, onRefresh }) {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">Farmer</label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedFarmer}
          onChange={e => onFarmerChange(e.target.value)}
        >
          {farmers.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <button
        onClick={onRefresh}
        className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
      >
        Atualizar
      </button>
    </div>
  )
}
