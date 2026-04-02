// src/api/dashboard.js
const BASE = '/api'

export async function fetchFarmers() {
  const res = await fetch(`${BASE}/farmers`)
  if (!res.ok) throw new Error('Erro ao buscar farmers')
  return res.json()
}

export async function fetchDashboard(farmer, stuckDays = 7) {
  const params = new URLSearchParams({ farmer, stuckDays })
  const res = await fetch(`${BASE}/dashboard?${params}`)
  if (!res.ok) throw new Error('Erro ao buscar dados do dashboard')
  return res.json()
}

export async function triggerAction(type, payload) {
  const res = await fetch(`${BASE}/actions/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Erro na ação ${type}`)
  return data
}
