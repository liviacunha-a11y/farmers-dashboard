// backend/slack-daily.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { WebClient } = require('@slack/web-api')
const farmerConfig = require('./farmer-whatsapp.json')

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN
if (!SLACK_TOKEN) {
  console.error('SLACK_BOT_TOKEN não configurado no .env')
  process.exit(1)
}

const slack = new WebClient(SLACK_TOKEN)
const API_BASE = `http://localhost:${process.env.PORT || 3001}`
const TEST_EMAIL = 'livia.cunha@seazone.com.br'
const isTest = process.argv.includes('--test')

async function fetchDashboard(farmer) {
  const res = await fetch(`${API_BASE}/api/dashboard?farmer=${encodeURIComponent(farmer)}`)
  if (!res.ok) throw new Error(`API retornou ${res.status} para ${farmer}`)
  return res.json()
}

function calcKPIs(data) {
  const dealsSemFUP = data.stuckDeals.filter(d => Number(d.dias_parado) >= 3).length
  const orgIdsComIndicacao = new Set(data.partnerRanking.map(p => p.org_id))
  const parceirosSemIndicacao = data.inactivePartners.filter(p => !orgIdsComIndicacao.has(p.org_id)).length
  const semContato30d = data.inactivePartners.filter(p => Number(p.dias_inativo) > 30).length
  return { dealsSemFUP, parceirosSemIndicacao, semContato30d }
}

function buildMessage(farmerName, kpis) {
  const firstName = farmerName.split(' ')[0]
  return [
    `:ear_of_rice: Bom dia, ${firstName}! Seu resumo diário:`,
    '',
    `:bar_chart: *Dashboard:* http://localhost:5173`,
    '',
    `:warning: *Deals sem FUP há +3 dias:* ${kpis.dealsSemFUP}`,
    `:no_bell: *Parceiros sem indicação:* ${kpis.parceirosSemIndicacao}`,
    `:mobile_phone_off: *+30 dias sem contato com parceiro:* ${kpis.semContato30d}`,
    '',
    `Bora engajar! :muscle:`,
  ].join('\n')
}

async function getSlackUserId(email) {
  const res = await slack.users.lookupByEmail({ email })
  return res.user.id
}

async function sendDM(userId, text) {
  await slack.chat.postMessage({ channel: userId, text })
}

async function main() {
  // Check if backend is running
  try {
    await fetch(`${API_BASE}/api/health`)
  } catch {
    console.error('Backend não está rodando em', API_BASE)
    process.exit(1)
  }

  const farmers = Object.entries(farmerConfig).filter(([k]) => !k.startsWith('_'))

  if (isTest) {
    console.log('[TESTE] Enviando insights de todos os farmers para', TEST_EMAIL)
    let testUserId
    try {
      testUserId = await getSlackUserId(TEST_EMAIL)
    } catch (err) {
      console.error(`Não foi possível encontrar ${TEST_EMAIL} no Slack:`, err.message)
      process.exit(1)
    }

    for (const [name] of farmers) {
      try {
        console.log(`Buscando dados de ${name}...`)
        const data = await fetchDashboard(name)
        const kpis = calcKPIs(data)
        const msg = buildMessage(name, kpis)
        await sendDM(testUserId, msg)
        console.log(`[OK] ${name} — enviado para ${TEST_EMAIL}`)
      } catch (err) {
        console.error(`[ERRO] ${name}:`, err.message)
      }
    }
  } else {
    console.log('[PRODUÇÃO] Enviando DMs para farmers ativos')
    for (const [name, config] of farmers) {
      if (!config.slack_active) {
        console.log(`[SKIP] ${name} — slack_active=false`)
        continue
      }
      try {
        console.log(`Buscando dados de ${name}...`)
        const data = await fetchDashboard(name)
        const kpis = calcKPIs(data)
        const msg = buildMessage(name, kpis)
        const userId = await getSlackUserId(config.email)
        await sendDM(userId, msg)
        console.log(`[OK] ${name} — DM enviado`)
      } catch (err) {
        console.error(`[ERRO] ${name}:`, err.message)
      }
    }
  }

  console.log('Concluído.')
}

main()
