// backend/__tests__/actions.test.js
const axios = require('axios')
jest.mock('axios')

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }) }),
}))

const { executeCall } = require('../actions/call')
const { executeWhatsapp } = require('../actions/whatsapp')
const { executeEmail } = require('../actions/email')

const payload = {
  dealId: '123',
  orgId: '456',
  orgName: 'Myside',
  phone: '+5547999999999',
  email: 'contato@myside.com',
  farmerName: 'Luana Schaikoski',
}

// Mock Pipedrive success response
const pipedriveOk = { data: { success: true, data: { id: 1 } } }

describe('executeCall', () => {
  it('chama api4com e registra no Pipedrive', async () => {
    axios.post
      .mockResolvedValueOnce({ data: { success: true, callId: 'abc' } }) // api4com
      .mockResolvedValueOnce(pipedriveOk) // pipedrive
    const result = await executeCall(payload)
    expect(result.message).toMatch(/iniciada/i)
    expect(axios.post).toHaveBeenCalledTimes(2)
  })

  it('lança erro se farmer não tem ramal configurado', async () => {
    await expect(executeCall({ ...payload, farmerName: 'Desconhecido' }))
      .rejects.toThrow('Ramal não configurado')
  })

  it('lança erro se api4com falhar', async () => {
    axios.post.mockRejectedValueOnce(new Error('api4com timeout'))
    await expect(executeCall(payload)).rejects.toThrow('api4com timeout')
  })
})

describe('executeWhatsapp', () => {
  beforeEach(() => jest.clearAllMocks())

  it('chama Timelines.ai e registra no Pipedrive', async () => {
    axios.post
      .mockResolvedValueOnce({ data: { id: 'msg_1' } }) // timelines.ai
      .mockResolvedValueOnce(pipedriveOk) // pipedrive
    const result = await executeWhatsapp(payload)
    expect(result.message).toMatch(/whatsapp/i)
    expect(axios.post).toHaveBeenCalledTimes(2)
  })
})

describe('executeEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('envia email e registra no Pipedrive', async () => {
    axios.post.mockResolvedValueOnce(pipedriveOk) // pipedrive
    const result = await executeEmail(payload)
    expect(result.message).toMatch(/email/i)
    expect(axios.post).toHaveBeenCalledTimes(1) // só pipedrive (nodemailer é mockado)
  })
})
