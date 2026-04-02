// backend/index.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const path = require('path')
const express = require('express')
const cors = require('cors')
const { executeQuery } = require('./nektClient')
const {
  INACTIVE_PARTNERS_QUERY,
  STUCK_DEALS_QUERY,
  PARTNER_RANKING_QUERY,
  CONTACT_INFO_QUERY,
  interpolate,
} = require('./queries')

const { executeCall } = require('./actions/call')
const { executeWhatsapp } = require('./actions/whatsapp')
const whatsappNumbers = require('./farmer-whatsapp.json')

const FARMER_NAMES = Object.keys(whatsappNumbers).filter(k => !k.startsWith('_'))
const DEFAULT_STUCK_DAYS = 0

const app = express()
app.use(cors())
app.use(express.json())

// Cache em memória com TTL de 10 minutos
const _cache = new Map()
const CACHE_TTL = 10 * 60 * 1000

function getCached(key) {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null }
  return entry.value
}

function setCached(key, value) {
  _cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL })
}

// Lógica central de busca de dados do dashboard
async function buildDashboard(farmer) {
  const [inactiveResult, stuckResult, rankingResult] = await Promise.all([
    executeQuery(interpolate(INACTIVE_PARTNERS_QUERY, { farmer })),
    executeQuery(interpolate(STUCK_DEALS_QUERY, { farmer })),
    executeQuery(interpolate(PARTNER_RANKING_QUERY, { farmer })),
  ])

  const allOrgIds = [
    ...inactiveResult.data.map(r => r[0]),
    ...stuckResult.data.map(r => r[2]),
    ...rankingResult.data.map(r => r[1]),
  ].filter(v => v && !isNaN(Number(v)))

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

  const toObj = (cols, row) => Object.fromEntries(cols.map((c, i) => [c, row[i]]))

  return {
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
  }
}

// Pré-aquece cache para todos os farmers sequencialmente em background
async function prewarm() {
  console.log(`[cache] Iniciando pré-aquecimento para ${FARMER_NAMES.length} farmers...`)
  for (const farmer of FARMER_NAMES) {
    const key = `${farmer}:${DEFAULT_STUCK_DAYS}`
    if (getCached(key)) continue
    try {
      const result = await buildDashboard(farmer)
      setCached(key, result)
      console.log(`[cache] OK: ${farmer}`)
    } catch (err) {
      console.error(`[cache] ERRO ${farmer}:`, err.message)
    }
  }
  console.log('[cache] Pré-aquecimento concluído.')
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/farmers', (_req, res) => res.json(FARMER_NAMES.sort()))

app.get('/api/dashboard', async (req, res) => {
  const { farmer } = req.query
  if (!farmer) return res.status(400).json({ error: 'farmer é obrigatório' })

  const cacheKey = farmer
  const cached = getCached(cacheKey)
  if (cached) {
    res.setHeader('X-Cache', 'HIT')
    return res.json(cached)
  }

  try {
    const result = await buildDashboard(farmer)
    setCached(cacheKey, result)
    res.setHeader('X-Cache', 'MISS')
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/cache/clear', (req, res) => {
  const { farmer } = req.body
  if (farmer) {
    for (const key of _cache.keys()) {
      if (key.startsWith(`${farmer}:`)) _cache.delete(key)
    }
  } else {
    _cache.clear()
  }
  res.json({ ok: true })
})

app.post('/api/actions/call', async (req, res) => {
  try {
    const result = await executeCall(req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/actions/whatsapp', async (req, res) => {
  try {
    const result = await executeWhatsapp(req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Servir frontend estático (build do Vite)
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(distPath, 'index.html'))
})

const PORT = process.env.PORT || 3001
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend rodando em http://localhost:${PORT}`)
    // Pré-aquece cache em background sem bloquear o servidor
    prewarm().catch(err => console.error('[cache] Falha no pré-aquecimento:', err.message))
  })
}

module.exports = app
