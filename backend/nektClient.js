// backend/nektClient.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const axios = require('axios')

let _requestId = 1

async function executeQuery(sql_query) {
  const id = _requestId++
  const response = await axios.post(
    process.env.NEKT_API_URL || 'https://nekt-mcp.seazone.com.br/mcp',
    {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'execute_sql',
        arguments: { sql_query },
      },
      id,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEKT_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const { result, error } = response.data

  if (error) throw new Error(error.message || 'nekt MCP error')

  const parsed = JSON.parse(result.content[0].text)
  if (parsed.status !== 'succeeded') throw new Error(parsed.error || 'nekt query failed')

  return { columns: parsed.columns, data: parsed.data }
}

module.exports = { executeQuery }
