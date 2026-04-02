// backend/queries.js
//
// Canal IDs de "indicação" no campo customizado "Canal" do Pipedrive:
//   582  = Indicação de Corretor
//   583  = Indicaçao de Franquia
//   2876 = Indicação de outros Parceiros (exceto corretor e franquia)
//   543  = Indicação de Colaborador
//   830  = Indicação de Embaixador
//   622  = Indicação de Hóspede
//   10   = Indicação de Clientes
const CANAL_INDICACAO_IDS = '582,583,2876,543,830,622,10'
const CANAL_FIELD_KEY = '93b3ada8b94bd1fc4898a25754d6bcac2713f835'

// Tipo de Venda: 467 = Parceiro
// Se canal=Marketing mas tipo_venda=Parceiro, também conta como indicação
const TIPO_VENDA_KEY = '7c49d85470c1c8a553fa0faee757883157b7830b'
const TIPO_VENDA_PARCEIRO = 467

// Condição reutilizável: deal é indicação se canal de indicação OU tipo_venda = Parceiro
// Usada como: WHERE (${IS_INDICACAO})
const IS_INDICACAO = `d.custom_fields."${CANAL_FIELD_KEY}" IN (${CANAL_INDICACAO_IDS}) OR d.custom_fields."${TIPO_VENDA_KEY}" = ${TIPO_VENDA_PARCEIRO}`

// Orgs deletadas/merged no Pipedrive mas com is_deleted=false no nekt
const EXCLUDED_ORG_IDS = '257,12771,336,8646,8098,5148,829'

// Campos de org:
//   354356cc... = "Situação" (enum): 3954=Ativo, 3955=Inativo, 3956=Distrato
//   owner_id = proprietário da org no Pipedrive (usado para vincular org ao farmer)
const SITUACAO_ATIVO = 3954

// Q1 — Lista de farmers (usuários com deals de indicação)
const FARMERS_QUERY = `
  SELECT DISTINCT u.name
  FROM "nekt_trusted"."pipedrive_v2_deals" d
  JOIN "nekt_trusted"."pipedrive_v2_users" u ON d.owner_id = u.id
  WHERE (${IS_INDICACAO})
    AND u.name IS NOT NULL
    AND u.name NOT IN ('-', 'BizOps', 'bizops', 'Automacao', 'Sapron', 'cs@seazone.com.br')
  ORDER BY u.name
`

// Q2 — Parceiros inativos
// Orgs cujo owner_id = farmer selecionado, com Situação = Ativo,
// sem atividade do farmer há +30 dias (ou nunca teve atividade).
const INACTIVE_PARTNERS_QUERY = `
  WITH farmer AS (
    SELECT id AS owner_id
    FROM "nekt_trusted"."pipedrive_v2_users"
    WHERE name = :farmer
  ),
  orgs_do_farmer AS (
    SELECT o.id AS org_id, o.name AS org_name
    FROM "nekt_trusted"."pipedrive_v2_organizations" o
    JOIN farmer f ON o.owner_id = f.owner_id
    WHERE o.is_deleted = false
      AND o.id NOT IN (${EXCLUDED_ORG_IDS})
      AND o.custom_fields."354356cc904b4977c93f537809a6b3c405e07daf" = ${SITUACAO_ATIVO}
  ),
  ultima_atividade AS (
    SELECT
      act.org_id,
      MAX(act.add_time) AS ultima_atividade
    FROM "nekt_trusted"."pipedrive_v2_activities" act
    JOIN orgs_do_farmer odf ON act.org_id = odf.org_id
    WHERE act.done = true
    GROUP BY act.org_id
  )
  SELECT
    odf.org_id,
    odf.org_name,
    ua.ultima_atividade AS ultima_indicacao,
    DATE_DIFF('day',
      COALESCE(ua.ultima_atividade, TIMESTAMP '2000-01-01'),
      CURRENT_TIMESTAMP
    ) AS dias_inativo
  FROM orgs_do_farmer odf
  LEFT JOIN ultima_atividade ua ON odf.org_id = ua.org_id
  ORDER BY dias_inativo DESC
`

// Q3 — Todos os deals abertos do farmer, com dias sem atividade
// Usa pipedrive_v2_activities (não deal_flow, que pode estar vazia)
const STUCK_DEALS_QUERY = `
  WITH farmer AS (
    SELECT id AS owner_id
    FROM "nekt_trusted"."pipedrive_v2_users"
    WHERE name = :farmer
  ),
  deals_do_farmer AS (
    SELECT
      d.id AS deal_id,
      d.title AS deal_title,
      d.org_id,
      o.name AS org_name,
      d.add_time AS deal_criado_em
    FROM "nekt_trusted"."pipedrive_v2_deals" d
    JOIN farmer f ON d.owner_id = f.owner_id
    LEFT JOIN "nekt_trusted"."pipedrive_v2_organizations" o ON d.org_id = o.id
    WHERE d.status = 'open'
  ),
  ultima_atividade AS (
    SELECT
      act.deal_id,
      MAX(act.add_time) AS ultima_atividade
    FROM "nekt_trusted"."pipedrive_v2_activities" act
    JOIN deals_do_farmer df ON act.deal_id = df.deal_id
    WHERE act.done = true
    GROUP BY act.deal_id
  )
  SELECT
    df.deal_id,
    df.deal_title,
    df.org_id,
    df.org_name,
    COALESCE(ua.ultima_atividade, df.deal_criado_em) AS ultima_atividade,
    DATE_DIFF('day',
      COALESCE(ua.ultima_atividade, df.deal_criado_em),
      CURRENT_TIMESTAMP
    ) AS dias_parado
  FROM deals_do_farmer df
  LEFT JOIN ultima_atividade ua ON df.deal_id = ua.deal_id
  ORDER BY dias_parado DESC
`

// Q4 — Ranking de parceiros com conversão
// Orgs cujo owner_id = farmer selecionado.
// Indicações = todos os deals won + lost da org (exceto título "teste" e perdido por Duplicado/Erro).
// Ganhos = deals com status 'won' (exceto título "teste").
const PARTNER_RANKING_QUERY = `
  WITH farmer AS (
    SELECT id AS owner_id
    FROM "nekt_trusted"."pipedrive_v2_users"
    WHERE name = :farmer
  ),
  orgs_do_farmer AS (
    SELECT o.id AS org_id, o.name AS org_name
    FROM "nekt_trusted"."pipedrive_v2_organizations" o
    JOIN farmer f ON o.owner_id = f.owner_id
    WHERE o.is_deleted = false
      AND o.id NOT IN (${EXCLUDED_ORG_IDS})
  ),
  indicacoes AS (
    SELECT
      d.org_id,
      COUNT(DISTINCT d.id) AS total_indicacoes,
      MAX(d.add_time) AS ultima_indicacao
    FROM "nekt_trusted"."pipedrive_v2_deals" d
    JOIN orgs_do_farmer odf ON d.org_id = odf.org_id
    WHERE d.status IN ('won', 'lost')
      AND LOWER(d.title) NOT LIKE '%teste%'
      AND (d.lost_reason IS NULL OR d.lost_reason != 'Duplicado/Erro')
    GROUP BY d.org_id
  ),
  ganhos AS (
    SELECT
      d.org_id,
      COUNT(DISTINCT d.id) AS total_ganhos
    FROM "nekt_trusted"."pipedrive_v2_deals" d
    JOIN orgs_do_farmer odf ON d.org_id = odf.org_id
    WHERE d.status = 'won'
      AND d.pipeline_id IN (28, 37, 14, 13, 45)
      AND LOWER(d.title) NOT LIKE '%teste%'
    GROUP BY d.org_id
  )
  SELECT
    odf.org_name AS parceiro,
    odf.org_id,
    COALESCE(i.total_indicacoes, 0) AS total_indicacoes,
    COALESCE(g.total_ganhos, 0) AS total_ganhos,
    ROUND(
      CAST(COALESCE(g.total_ganhos, 0) AS DOUBLE)
      / NULLIF(COALESCE(i.total_indicacoes, 0), 0) * 100, 1
    ) AS conversao_pct,
    i.ultima_indicacao
  FROM orgs_do_farmer odf
  LEFT JOIN indicacoes i ON odf.org_id = i.org_id
  LEFT JOIN ganhos g ON odf.org_id = g.org_id
  WHERE COALESCE(i.total_indicacoes, 0) > 0
  ORDER BY i.total_indicacoes DESC
`

// Q5 — Contatos por org_id (via pipedrive_v2_persons)
const CONTACT_INFO_QUERY = `
  WITH base AS (
    SELECT
      org_id,
      FILTER(phones, p -> p.primary = true) AS primary_phones,
      FILTER(emails, e -> e.primary = true) AS primary_emails
    FROM "nekt_trusted"."pipedrive_v2_persons"
    WHERE org_id IN (:orgIds)
      AND is_deleted = false
  )
  SELECT
    org_id,
    ARBITRARY(IF(CARDINALITY(primary_phones) > 0, primary_phones[1].value, NULL)) AS phone,
    ARBITRARY(IF(CARDINALITY(primary_emails) > 0, primary_emails[1].value, NULL)) AS email
  FROM base
  GROUP BY org_id
`

function interpolate(sql, params) {
  return Object.entries(params).reduce((q, [key, val]) => {
    if (Array.isArray(val)) {
      const list = val.map(v => {
        const n = Number(v)
        return !isNaN(n) && v !== '' ? n : `'${String(v).replace(/'/g, "''")}'`
      }).join(',')
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
