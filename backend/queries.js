// backend/queries.js

const FARMERS_QUERY = `
  SELECT DISTINCT owner_name
  FROM "nekt_trusted"."pipedrive_v2_deal_flow"
  WHERE owner_name IS NOT NULL
    AND owner_name != ''
    AND owner_name != '(deleted user)'
  ORDER BY owner_name
`

const INACTIVE_PARTNERS_QUERY = `
  WITH indicacoes AS (
    SELECT org_id, org_name,
           MAX(add_time) AS ultima_indicacao
    FROM "nekt_trusted"."pipedrive_v2_deal_flow"
    WHERE owner_name = :farmer
      AND LOWER(CAST(new_value AS VARCHAR)) LIKE '%indica%'
    GROUP BY org_id, org_name
  ),
  orgs_do_farmer AS (
    SELECT DISTINCT org_id, org_name
    FROM "nekt_trusted"."pipedrive_v2_deal_flow"
    WHERE owner_name = :farmer
      AND org_id IS NOT NULL
      AND org_name IS NOT NULL AND org_name != ''
  )
  SELECT
    o.org_id,
    o.org_name,
    i.ultima_indicacao,
    DATE_DIFF('day',
      COALESCE(i.ultima_indicacao, TIMESTAMP '2000-01-01'),
      CURRENT_TIMESTAMP
    ) AS dias_inativo
  FROM orgs_do_farmer o
  LEFT JOIN indicacoes i ON o.org_id = i.org_id
  WHERE i.ultima_indicacao IS NULL
     OR DATE_DIFF('day', i.ultima_indicacao, CURRENT_TIMESTAMP) > 30
  ORDER BY dias_inativo DESC
`

const STUCK_DEALS_QUERY = `
  WITH ultima_atividade AS (
    SELECT
      deal_id,
      deal_title,
      org_id,
      org_name,
      MAX(add_time) AS ultima_atividade
    FROM "nekt_trusted"."pipedrive_v2_deal_flow"
    WHERE owner_name = :farmer
      AND deal_id IS NOT NULL
      AND "type" IN (
        'whatsapp_chat','call','reuniao','follow_up','mensagem',
        'chamada_atendida_api4com','reuniao_avaliacao',
        'reuniao_apresentacao_contr'
      )
    GROUP BY deal_id, deal_title, org_id, org_name
  )
  SELECT
    deal_id,
    deal_title,
    org_id,
    org_name,
    ultima_atividade,
    DATE_DIFF('day', ultima_atividade, CURRENT_TIMESTAMP) AS dias_parado
  FROM ultima_atividade
  WHERE DATE_DIFF('day', ultima_atividade, CURRENT_TIMESTAMP) >= :stuckDays
  ORDER BY dias_parado DESC
`

const PARTNER_RANKING_QUERY = `
  WITH indicacoes AS (
    SELECT
      org_id,
      org_name,
      COUNT(DISTINCT deal_id) AS total_indicacoes,
      MAX(add_time)           AS ultima_indicacao
    FROM "nekt_trusted"."pipedrive_v2_deal_flow"
    WHERE owner_name = :farmer
      AND org_id IS NOT NULL
      AND LOWER(CAST(new_value AS VARCHAR)) LIKE '%indica%'
    GROUP BY org_id, org_name
  ),
  ganhos AS (
    SELECT
      org_id,
      COUNT(DISTINCT item_id) AS total_ganhos
    FROM "nekt_trusted"."pipedrive_deal_flow"
    WHERE field_key = 'status'
      AND new_value = 'won'
    GROUP BY org_id
  )
  SELECT
    i.org_name                                                             AS parceiro,
    i.org_id,
    i.total_indicacoes,
    COALESCE(g.total_ganhos, 0)                                           AS total_ganhos,
    ROUND(
      CAST(COALESCE(g.total_ganhos, 0) AS DOUBLE)
      / NULLIF(i.total_indicacoes, 0) * 100, 1
    )                                                                      AS conversao_pct,
    i.ultima_indicacao
  FROM indicacoes i
  LEFT JOIN ganhos g ON i.org_id = g.org_id
  ORDER BY i.total_indicacoes DESC
`

const CONTACT_INFO_QUERY = `
  SELECT
    ipo.org_id,
    mpl.primaryphonestring AS phone,
    mpl.lead_email         AS email
  FROM "nekt_trusted"."ids_parceiro_org" ipo
  LEFT JOIN "nekt_trusted"."meetime_parceiros_leads" mpl
         ON CAST(mpl.pipedriveid AS VARCHAR) = CAST(ipo.id AS VARCHAR)
  WHERE ipo.org_id IN (:orgIds)
`

function interpolate(sql, params) {
  return Object.entries(params).reduce((q, [key, val]) => {
    if (Array.isArray(val)) {
      const list = val.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')
      return q.replace(new RegExp(`:${key}`, 'g'), list)
    }
    const safe = typeof val === 'number' ? val : `'${String(val).replace(/'/g, "''")}'`
    return q.replace(new RegExp(`:${key}`, 'g'), safe)
  }, sql)
}

module.exports = {
  FARMERS_QUERY,
  INACTIVE_PARTNERS_QUERY,
  STUCK_DEALS_QUERY,
  PARTNER_RANKING_QUERY,
  CONTACT_INFO_QUERY,
  interpolate,
}
