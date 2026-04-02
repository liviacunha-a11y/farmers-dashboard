// backend/nektClient.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const axios = require('axios')

const NEKT_URL = process.env.NEKT_API_URL || 'https://nekt-mcp.seazone.com.br/mcp'
const AUTH = `Bearer ${process.env.NEKT_API_TOKEN}`
const ACCEPT = 'application/json, text/event-stream'

let _sessionId = null
let _initPromise = null
let _requestId = 1

// Inicializa sessão MCP — serializado para evitar double-init com queries paralelas
async function getSession() {
  if (_sessionId) return _sessionId
  if (!_initPromise) {
    _initPromise = axios.post(
      NEKT_URL,
      {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'farmers-dashboard', version: '1.0.0' },
        },
        id: _requestId++,
      },
      {
        headers: {
          Authorization: AUTH,
          'Content-Type': 'application/json',
          Accept: ACCEPT,
        },
      }
    ).then(res => {
      const sessionId = res.headers['mcp-session-id']
      if (!sessionId) throw new Error('nekt: session ID não retornado na inicialização')
      _sessionId = sessionId
      _initPromise = null
      return sessionId
    }).catch(err => {
      _initPromise = null
      throw err
    })
  }
  return _initPromise
}

// Extrai JSON do formato SSE (event: message\ndata: {...})
function parseSSE(raw) {
  for (const line of String(raw).split('\n')) {
    if (line.startsWith('data:')) {
      try { return JSON.parse(line.slice(5).trim()) } catch (_) {}
    }
  }
  return null
}

async function executeQuery(sql_query) {
  const sessionId = await getSession()

  const res = await axios.post(
    NEKT_URL,
    {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'execute_sql', arguments: { sql_query } },
      id: _requestId++,
    },
    {
      headers: {
        Authorization: AUTH,
        'Content-Type': 'application/json',
        Accept: ACCEPT,
        'mcp-session-id': sessionId,
      },
      responseType: 'text',
      timeout: 120000,
    }
  )

  const parsed = parseSSE(res.data)
  if (!parsed) throw new Error('nekt: resposta inválida do servidor')
  if (parsed.error) throw new Error(parsed.error.message || 'nekt MCP error')

  const content = parsed.result?.content?.[0]?.text
  if (!content) throw new Error('nekt: conteúdo vazio na resposta')

  const result = JSON.parse(content)
  if (result.status !== 'succeeded') throw new Error(result.error || 'nekt query falhou')

  return { columns: result.columns, data: result.data }
}

module.exports = { executeQuery }
