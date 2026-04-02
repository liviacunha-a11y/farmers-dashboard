// src/hooks/useDashboardData.js
import { useState, useEffect, useCallback } from 'react'
import { fetchFarmers, fetchDashboard } from '../api/dashboard'

export function useDashboardData() {
  const [farmers, setFarmers] = useState([])
  const [selectedFarmer, setSelectedFarmer] = useState('')
  const [stuckDays, setStuckDays] = useState(7)
  const [data, setData] = useState({ inactivePartners: [], stuckDeals: [], partnerRanking: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFarmers()
      .then(list => {
        setFarmers(list)
        if (list.length > 0) setSelectedFarmer(list[0])
      })
      .catch(err => setError(err.message))
  }, [])

  const refresh = useCallback(() => {
    if (!selectedFarmer) return
    setLoading(true)
    setError(null)
    fetchDashboard(selectedFarmer, stuckDays)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [selectedFarmer, stuckDays])

  useEffect(() => { refresh() }, [refresh])

  return { farmers, selectedFarmer, setSelectedFarmer, stuckDays, setStuckDays, data, loading, error, refresh }
}
