// backend/__tests__/routes.test.js
const request = require('supertest')
const axios = require('axios')
jest.mock('axios')

const app = require('../index')

function mockNekt(payload) {
  axios.post.mockResolvedValueOnce({
    data: {
      jsonrpc: '2.0',
      id: expect.any(Number),
      result: { content: [{ type: 'text', text: JSON.stringify(payload) }] }
    }
  })
}

describe('GET /api/farmers', () => {
  it('retorna lista de farmers', async () => {
    mockNekt({ status: 'succeeded', columns: ['owner_name'], data: [['Luana Schaikoski'], ['Raira Cardili']] })
    const res = await request(app).get('/api/farmers')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(['Luana Schaikoski', 'Raira Cardili'])
  })

  it('retorna 500 se nekt falhar', async () => {
    axios.post.mockRejectedValueOnce(new Error('timeout'))
    const res = await request(app).get('/api/farmers')
    expect(res.status).toBe(500)
    expect(res.body.error).toBeDefined()
  })
})

describe('GET /api/dashboard', () => {
  it('retorna 400 se farmer não for fornecido', async () => {
    const res = await request(app).get('/api/dashboard')
    expect(res.status).toBe(400)
  })

  it('retorna dados consolidados para farmer e stuckDays', async () => {
    // 3 queries em paralelo: inactive, stuck, ranking
    mockNekt({ status: 'succeeded', columns: ['org_id','org_name','ultima_indicacao','dias_inativo'], data: [['1','Myside','2025-01-01','81']] })
    mockNekt({ status: 'succeeded', columns: ['deal_id','deal_title','org_id','org_name','ultima_atividade','dias_parado'], data: [['123','Lead Myside','1','Myside','2025-03-20','13']] })
    mockNekt({ status: 'succeeded', columns: ['parceiro','org_id','total_indicacoes','total_ganhos','conversao_pct','ultima_indicacao'], data: [['Myside','1','78','12','15.4','2025-03-01']] })
    // 4a query: contact info
    mockNekt({ status: 'succeeded', columns: ['org_id','phone','email'], data: [['1','+5547999999999','contato@myside.com']] })

    const res = await request(app)
      .get('/api/dashboard')
      .query({ farmer: 'Luana Schaikoski', stuckDays: 7 })

    expect(res.status).toBe(200)
    expect(res.body.inactivePartners).toHaveLength(1)
    expect(res.body.inactivePartners[0].org_name).toBe('Myside')
    expect(res.body.inactivePartners[0].contact.phone).toBe('+5547999999999')
    expect(res.body.stuckDeals).toHaveLength(1)
    expect(res.body.stuckDeals[0].contact.phone).toBe('+5547999999999')
    expect(res.body.partnerRanking).toHaveLength(1)
  })
})
