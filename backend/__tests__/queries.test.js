// backend/__tests__/queries.test.js
const axios = require('axios')
jest.mock('axios')

const { executeQuery } = require('../nektClient')

describe('executeQuery', () => {
  it('envia sql_query via MCP JSON-RPC e retorna colunas + data', async () => {
    const nektPayload = { status: 'succeeded', columns: ['owner_name'], data: [['Luana Schaikoski'], ['Raira Cardili']] }
    axios.post.mockResolvedValue({
      data: {
        jsonrpc: '2.0',
        id: 1,
        result: { content: [{ type: 'text', text: JSON.stringify(nektPayload) }] }
      }
    })

    const result = await executeQuery('SELECT DISTINCT owner_name FROM t')
    expect(result.columns).toEqual(['owner_name'])
    expect(result.data).toHaveLength(2)
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('nekt-mcp'),
      expect.objectContaining({ method: 'tools/call', params: expect.objectContaining({ name: 'execute_sql' }) }),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.any(String) }) })
    )
  })

  it('lança erro quando status não é succeeded', async () => {
    const nektPayload = { status: 'failed', error: 'syntax error' }
    axios.post.mockResolvedValue({
      data: {
        jsonrpc: '2.0',
        id: 1,
        result: { content: [{ type: 'text', text: JSON.stringify(nektPayload) }] }
      }
    })
    await expect(executeQuery('INVALID SQL')).rejects.toThrow('syntax error')
  })

  it('lança erro quando JSON-RPC retorna error', async () => {
    axios.post.mockResolvedValue({
      data: { jsonrpc: '2.0', id: 1, error: { message: 'unauthorized' } }
    })
    await expect(executeQuery('SELECT 1')).rejects.toThrow('unauthorized')
  })
})

const { interpolate } = require('../queries')

describe('interpolate', () => {
  it('substitui parâmetro string', () => {
    const result = interpolate('WHERE name = :farmer', { farmer: "Luana's" })
    expect(result).toBe("WHERE name = 'Luana''s'")
  })

  it('substitui parâmetro numérico sem aspas', () => {
    const result = interpolate('WHERE days >= :stuckDays', { stuckDays: 7 })
    expect(result).toBe('WHERE days >= 7')
  })

  it('substitui array como lista IN', () => {
    const result = interpolate('WHERE org_id IN (:orgIds)', { orgIds: [1, 2, 3] })
    expect(result).toBe("WHERE org_id IN ('1','2','3')")
  })
})
