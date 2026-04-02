// backend/actions/whatsapp.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const axios = require('axios')
const { registerActivity } = require('../pipedriveClient')
const whatsappNumbers = require('../farmer-whatsapp.json')

async function executeWhatsapp({ dealId, orgId, orgName, phone, farmerName }) {
  const entry = whatsappNumbers[farmerName]
  const senderPhone = typeof entry === 'string' ? entry : entry?.whatsapp
  if (!senderPhone || farmerName === '_TODO') {
    throw new Error(`Número WhatsApp não configurado para ${farmerName}. Adicione em backend/farmer-whatsapp.json.`)
  }

  const message = `Olá ${orgName}! Tudo bem? Passando para retomar nossa conversa. Posso ajudar com algo? 😊`

  await axios.post(
    `${process.env.TIMELINES_AI_BASE_URL}/messages`,
    {
      phone,
      whatsapp_account: senderPhone,
      text: message,
    },
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
