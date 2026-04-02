// backend/api4comClient.js
// Busca ramais da api4com automaticamente pelo email do farmer
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const axios = require('axios')
const { executeQuery } = require('./nektClient')

const BASE_URL = process.env.API4COM_BASE_URL || 'https://api.api4com.com'

// Cache em memória: expira após 1 hora
let _extensionsCache = null
let _cacheTime = 0
const CACHE_TTL_MS = 60 * 60 * 1000

async function getExtensions() {
  const now = Date.now()
  if (_extensionsCache && now - _cacheTime < CACHE_TTL_MS) {
    return _extensionsCache
  }

  const response = await axios.get(`${BASE_URL}/api/v1/extensions`, {
    headers: { Authorization: process.env.API4COM_API_KEY },
  })

  _extensionsCache = response.data
  _cacheTime = now
  return _extensionsCache
}

async function getFarmerEmail(farmerName) {
  const { data } = await executeQuery(
    `SELECT email FROM "nekt_trusted"."pipedrive_v2_users" WHERE name = '${farmerName.replace(/'/g, "''")}' LIMIT 1`
  )
  if (!data || data.length === 0) throw new Error(`Usuário não encontrado no Pipedrive: ${farmerName}`)
  return data[0][0]
}

async function getExtensionByFarmerName(farmerName) {
  const [email, extensions] = await Promise.all([
    getFarmerEmail(farmerName),
    getExtensions(),
  ])

  const found = extensions.find(
    ext => ext.email_address && ext.email_address.toLowerCase() === email.toLowerCase()
  )

  if (!found) {
    throw new Error(`Ramal não encontrado para ${farmerName} (${email}) no api4com`)
  }

  return found.ramal
}

module.exports = { getExtensionByFarmerName }
