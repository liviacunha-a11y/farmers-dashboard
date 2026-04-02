// backend/index.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const express = require('express')
const cors = require('cors')
const { executeQuery } = require('./nektClient')
const {
  FARMERS_QUERY,
  INACTIVE_PARTNERS_QUERY,
  STUCK_DEALS_QUERY,
  PARTNER_RANKING_QUERY,
  CONTACT_INFO_QUERY,
  interpolate,
} = require('./queries')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Lista de farmers
app.get('/api/farmers', async (_req, res) => {
  try {
    const { data } = await executeQuery(FARMERS_QUERY)
    res.json(data.map(row => row[0]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Dashboard consolidado
app.get('/api/dashboard', async (req, res) => {
  const { farmer, stuckDays = 7 } = req.query
  if (!farmer) return res.status(400).json({ error: 'farmer é obrigatório' })

  try {
    const [inactiveResult, stuckResult, rankingResult] = await Promise.all([
      executeQuery(interpolate(INACTIVE_PARTNERS_QUERY, { farmer })),
      executeQuery(interpolate(STUCK_DEALS_QUERY, { farmer, stuckDays: Number(stuckDays) })),
      executeQuery(interpolate(PARTNER_RANKING_QUERY, { farmer })),
    ])

    // Coletar org_ids únicos para buscar contatos de uma vez
    const allOrgIds = [
      ...inactiveResult.data.map(r => r[0]),
      ...stuckResult.data.map(r => r[2]),
      ...rankingResult.data.map(r => r[1]),
    ].filter(Boolean)

    const uniqueOrgIds = [...new Set(allOrgIds)]
    let contactMap = {}

    if (uniqueOrgIds.length > 0) {
      const contactResult = await executeQuery(
        interpolate(CONTACT_INFO_QUERY, { orgIds: uniqueOrgIds })
      )
      contactResult.data.forEach(([orgId, phone, email]) => {
        contactMap[orgId] = { phone: phone || '', email: email || '' }
      })
    }

    const toObj = (cols, row) =>
      Object.fromEntries(cols.map((c, i) => [c, row[i]]))

    res.json({
      inactivePartners: inactiveResult.data.map(row => ({
        ...toObj(inactiveResult.columns, row),
        contact: contactMap[row[0]] || {},
      })),
      stuckDeals: stuckResult.data.map(row => ({
        ...toObj(stuckResult.columns, row),
        contact: contactMap[row[2]] || {},
      })),
      partnerRanking: rankingResult.data.map(row => ({
        ...toObj(rankingResult.columns, row),
        contact: contactMap[row[1]] || {},
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3001
if (require.main === module) {
  app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`))
}

module.exports = app
