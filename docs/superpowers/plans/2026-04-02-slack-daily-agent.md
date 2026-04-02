# Slack Daily Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Node.js script that sends daily Slack DMs to farmers with dashboard insights (deals without FUP, partners without indications, partners without contact).

**Architecture:** Standalone script `backend/slack-daily.js` calls the existing dashboard API for each farmer, calculates 3 KPIs, and sends formatted Slack DMs. `--test` mode sends all messages to a test user. Production mode only sends to farmers with `slack_active: true`.

**Tech Stack:** Node.js, @slack/web-api, existing Express backend API

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/farmer-whatsapp.json` | Modify | Change format from `"name": "phone"` to `"name": { whatsapp, email, slack_active }` |
| `backend/index.js` | Modify | Update farmer name extraction to handle new JSON format |
| `backend/actions/whatsapp.js` | Modify | Read `.whatsapp` from nested object |
| `.env` | Modify | Add `SLACK_BOT_TOKEN` |
| `backend/slack-daily.js` | Create | Main script — fetch data, calculate KPIs, send Slack DMs |
| `backend/slack-daily.bat` | Create | Windows batch wrapper for Task Scheduler |

---

### Task 1: Update farmer-whatsapp.json format

**Files:**
- Modify: `backend/farmer-whatsapp.json`
- Modify: `backend/index.js:16-18`
- Modify: `backend/actions/whatsapp.js:8`

- [ ] **Step 1: Update farmer-whatsapp.json to new format**

```json
{
  "Thaynara Grincevicus Santana": { "whatsapp": "+554861365907", "email": "thaynara.grincevicus@seazone.com.br", "slack_active": false },
  "Leonardo Grosbelli": { "whatsapp": "+554825000324", "email": "leonardo.grosbelli@seazone.com.br", "slack_active": false },
  "Silas Rocha de Miranda": { "whatsapp": "+554891733837", "email": "silas.rocha@seazone.com.br", "slack_active": false },
  "Rodrigo Paixão": { "whatsapp": "+554891600521", "email": "rodrigo.paixao@seazone.com.br", "slack_active": false },
  "Fabio Cristiano": { "whatsapp": "+554831978156", "email": "fabio.jesus@seazone.com.br", "slack_active": false },
  "Amanda Peixoto": { "whatsapp": "+5548935053669", "email": "amanda.peixoto@seazone.com.br", "slack_active": false }
}
```

- [ ] **Step 2: Update backend/index.js to read new format**

Change line 18 from:
```javascript
const FARMER_NAMES = Object.keys(whatsappNumbers).filter(k => !k.startsWith('_'))
```
This line stays the same — `Object.keys()` still returns farmer names.

No change needed here. The farmer names are the keys, which haven't changed.

- [ ] **Step 3: Update backend/actions/whatsapp.js to read nested whatsapp**

Change line 8 from:
```javascript
const senderPhone = whatsappNumbers[farmerName]
```
To:
```javascript
const entry = whatsappNumbers[farmerName]
const senderPhone = typeof entry === 'string' ? entry : entry?.whatsapp
```

- [ ] **Step 4: Verify backend still works**

Run: `npx kill-port 3001 && cd "C:\Users\Nitro V15™\farmers-dashboard" && node backend/index.js`

Then in another terminal:
```
curl http://localhost:3001/api/farmers
curl "http://localhost:3001/api/dashboard?farmer=Amanda%20Peixoto"
```

Expected: same results as before — farmer list and dashboard data.

---

### Task 2: Add SLACK_BOT_TOKEN to .env

**Files:**
- Modify: `.env`

- [ ] **Step 1: Append Slack token to .env**

Add this line at the end of `.env`:
```
SLACK_BOT_TOKEN=xoxb-462947370822-10739857249779-haiKZNQswojKsjQD12J4lZ4t
```

---

### Task 3: Install @slack/web-api

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

Run:
```
cd "C:\Users\Nitro V15™\farmers-dashboard" && npm install @slack/web-api
```

Expected: `@slack/web-api` added to `dependencies` in `package.json`.

---

### Task 4: Create slack-daily.js

**Files:**
- Create: `backend/slack-daily.js`

- [ ] **Step 1: Create the script**

```javascript
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
  const parceirosSemIndicacao = data.partnerRanking.filter(p => Number(p.total_indicacoes) === 0).length
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
```

---

### Task 5: Create slack-daily.bat

**Files:**
- Create: `backend/slack-daily.bat`

- [ ] **Step 1: Create the batch wrapper**

```batch
@echo off
cd /d "C:\Users\Nitro V15™\farmers-dashboard"
node backend\slack-daily.js %*
```

This allows running from Task Scheduler. `%*` passes any arguments (like `--test`).

---

### Task 6: Test the script

**Files:** None (testing only)

- [ ] **Step 1: Ensure backend is running**

Run in PowerShell:
```
cd "C:\Users\Nitro V15™\farmers-dashboard"
npx kill-port 3001
node backend/index.js
```

- [ ] **Step 2: Run the test in a second PowerShell**

```
cd "C:\Users\Nitro V15™\farmers-dashboard"
node backend/slack-daily.js --test
```

Expected output:
```
[TESTE] Enviando insights de todos os farmers para livia.cunha@seazone.com.br
Buscando dados de Thaynara Grincevicus Santana...
[OK] Thaynara Grincevicus Santana — enviado para livia.cunha@seazone.com.br
Buscando dados de Leonardo Grosbelli...
[OK] Leonardo Grosbelli — enviado para livia.cunha@seazone.com.br
...
Concluído.
```

- [ ] **Step 3: Verify in Slack**

Open Slack and check DMs from "Farmers Daily Bot". Should have 6 messages, one per farmer, each with the 3 KPIs.

---

### Task 7: Configure Windows Task Scheduler

**Files:** None (OS configuration)

- [ ] **Step 1: Create scheduled task**

Open PowerShell as Administrator and run:

```powershell
$action = New-ScheduledTaskAction -Execute "C:\Users\Nitro V15™\farmers-dashboard\backend\slack-daily.bat"
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable
Register-ScheduledTask -TaskName "FarmersDailySlack" -Action $action -Trigger $trigger -Settings $settings -Description "Envia resumo diário no Slack para farmers"
```

- [ ] **Step 2: Also schedule the backend to start on login**

Create `backend/start-backend.bat`:
```batch
@echo off
cd /d "C:\Users\Nitro V15™\farmers-dashboard"
node backend\index.js
```

Then schedule it to run at logon:
```powershell
$action = New-ScheduledTaskAction -Execute "C:\Users\Nitro V15™\farmers-dashboard\backend\start-backend.bat"
$trigger = New-ScheduledTaskTrigger -AtLogon
Register-ScheduledTask -TaskName "FarmersBackend" -Action $action -Trigger $trigger -Description "Inicia o backend do Farmers Dashboard"
```

This ensures the backend is running when the Slack script fires at 9am.
