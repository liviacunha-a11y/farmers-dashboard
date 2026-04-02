# Slack Daily Agent — Design Spec

## Goal

Send a daily Slack DM to each farmer at 9am with key insights from the Farmers Dashboard: deals without follow-up, partners without indications, and partners without recent contact.

## Architecture

**Script standalone** (`backend/slack-daily.js`) that:
1. Calls the existing dashboard API (`http://localhost:3001`) for each farmer
2. Calculates 3 KPIs from the response
3. Looks up each farmer's Slack User ID by email (Slack `users.lookupByEmail`)
4. Sends a formatted DM via Slack `chat.postMessage`

**Scheduling:** Windows Task Scheduler runs `backend/slack-daily.bat` daily at 9:00 AM.

**Dependency:** Backend must be running on port 3001 when the script executes.

## Modes

- `node backend/slack-daily.js --test` — fetches data for ALL farmers, sends ALL messages to livia.cunha@seazone.com.br (ignores `slack_active` flag)
- `node backend/slack-daily.js` — fetches data per farmer, sends DM only to farmers with `slack_active: true`

## Farmer Config

`farmer-whatsapp.json` updated to include email and activation flag:

```json
{
  "Amanda Peixoto": { "whatsapp": "+5548935053669", "email": "amanda.peixoto@seazone.com.br", "slack_active": false },
  "Fabio Cristiano": { "whatsapp": "+554831978156", "email": "fabio.jesus@seazone.com.br", "slack_active": false },
  "Leonardo Grosbelli": { "whatsapp": "+554825000324", "email": "leonardo.grosbelli@seazone.com.br", "slack_active": false },
  "Rodrigo Paixão": { "whatsapp": "+554891600521", "email": "rodrigo.paixao@seazone.com.br", "slack_active": false },
  "Silas Rocha de Miranda": { "whatsapp": "+554891733837", "email": "silas.rocha@seazone.com.br", "slack_active": false },
  "Thaynara Grincevicus Santana": { "whatsapp": "+554861365907", "email": "thaynara.grincevicus@seazone.com.br", "slack_active": false }
}
```

All farmers start with `slack_active: false`. To activate, manually change to `true` in the JSON file.

The `--test` flag ignores `slack_active` and sends everything to livia.cunha@seazone.com.br.

## Backend Compatibility

The existing backend reads `farmer-whatsapp.json` for farmer names and WhatsApp numbers. The format change from `"name": "phone"` to `"name": { whatsapp, email, slack_active }` requires updating `backend/index.js` to read `whatsapp` from the object, and `backend/actions/whatsapp.js` to read the nested value.

## KPIs per farmer

| KPI | Source | Calculation |
|-----|--------|-------------|
| Deals sem FUP ha +3 dias | `stuckDeals` | Count where `dias_parado >= 3` |
| Parceiros sem indicacao | `partnerRanking` | Count where `total_indicacoes = 0` |
| +30 dias sem contato | `inactivePartners` | Count where `dias_inativo > 30` |

## Message Format

```
:ear_of_rice: Bom dia, {firstName}! Seu resumo diário:

:bar_chart: *Dashboard:* http://localhost:5173

:warning: *Deals sem FUP há +3 dias:* {count}
:speaker_off: *Parceiros sem indicação:* {count}
:mobile_phone_off: *+30 dias sem contato com parceiro:* {count}

Bora engajar! :muscle:
```

Uses Slack `mrkdwn` formatting.

## Files

| File | Purpose |
|------|---------|
| `backend/slack-daily.js` | Main script — fetches data, sends Slack DMs |
| `backend/slack-daily.bat` | Windows batch wrapper for Task Scheduler |
| `backend/farmer-whatsapp.json` | Updated with email + slack_active per farmer |
| `.env` | Add `SLACK_BOT_TOKEN=xoxb-...` |

## Dependencies

- `@slack/web-api` — official Slack SDK (install in project root)

## Error Handling

- If backend is not running: script logs error and exits with code 1
- If Slack email lookup fails for a farmer: log warning, skip that farmer, continue with others
- If Slack message send fails: log error, continue with other farmers

## Testing

1. Ensure backend is running (`npm run server`)
2. Run `node backend/slack-daily.js --test`
3. All 6 farmer insights are sent as DMs to livia.cunha@seazone.com.br
4. Verify message formatting and KPI accuracy against the dashboard UI
5. When satisfied, set `slack_active: true` for desired farmers in `farmer-whatsapp.json`
