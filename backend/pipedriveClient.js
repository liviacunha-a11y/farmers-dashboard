// backend/pipedriveClient.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const axios = require('axios')

async function registerActivity({ dealId, orgId, type, note }) {
  const payload = {
    subject: note,
    type,
    done: 1,
    note,
    ...(dealId && { deal_id: Number(dealId) }),
    ...(orgId && { org_id: Number(orgId) }),
  }

  const response = await axios.post(
    `https://api.pipedrive.com/v1/activities?api_token=${process.env.PIPEDRIVE_API_TOKEN}`,
    payload
  )

  if (!response.data.success) {
    throw new Error(`Pipedrive error: ${JSON.stringify(response.data)}`)
  }
  return response.data.data
}

module.exports = { registerActivity }
