// backend/actions/call.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const axios = require('axios')
const { registerActivity } = require('../pipedriveClient')
const extensions = require('../farmer-extensions.json')

async function executeCall({ dealId, orgId, phone, farmerName }) {
  const extension = extensions[farmerName]
  if (!extension) throw new Error(`Ramal não configurado para ${farmerName}`)

  await axios.post(
    `${process.env.API4COM_BASE_URL}/calls`,
    { extension, destination: phone },
    { headers: { Authorization: `Bearer ${process.env.API4COM_API_KEY}` } }
  )

  await registerActivity({
    dealId,
    orgId,
    type: 'call',
    note: `Ligação iniciada via dashboard Farmers para ${phone}`,
  })

  return { message: 'Ligação iniciada — registrada no Pipedrive' }
}

module.exports = { executeCall }
