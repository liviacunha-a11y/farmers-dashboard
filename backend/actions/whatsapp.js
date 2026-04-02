// backend/actions/whatsapp.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const axios = require('axios')
const { registerActivity } = require('../pipedriveClient')

async function executeWhatsapp({ dealId, orgId, orgName, phone, farmerName }) {
  const message = `Olá ${orgName}! Tudo bem? Passando para retomar nossa conversa. Posso ajudar com algo? 😊`

  await axios.post(
    `${process.env.TIMELINES_AI_BASE_URL}/messages`,
    { phone, message, from: process.env.TIMELINES_AI_PHONE },
    { headers: { Authorization: `Bearer ${process.env.TIMELINES_AI_API_KEY}` } }
  )

  await registerActivity({
    dealId,
    orgId,
    type: 'whatsapp_chat',
    note: `WhatsApp enviado via dashboard Farmers para ${orgName}: "${message}"`,
  })

  return { message: 'WhatsApp enviado — registrado no Pipedrive' }
}

module.exports = { executeWhatsapp }
