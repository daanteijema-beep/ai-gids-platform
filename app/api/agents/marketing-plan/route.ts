export const maxDuration = 180

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function isAuthorized(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || ''
  const auth = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  return secret === process.env.CRON_SECRET || auth === process.env.CRON_SECRET
}

function strip(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

// ─── Sociale media trends via Apify ───────────────────────────────────────────
// Scrapet actuele trending posts op LinkedIn en Instagram/TikTok via Google Search.
// Dit zorgt dat het marketing plan inspeelt op wat nu viraal gaat, niet op
// generieke "best practices" — het plan wordt dus elke week anders.
async function haalSocialeTrends(doelgroep: string, pijnpunt: string): Promise<string> {
  const token = process.env.APIFY_TOKEN
  if (!token) return ''

  const queries = [
    `site:linkedin.com/posts "${doelgroep}" AI OR automatisering 2026`,
    `site:instagram.com "${pijnpunt}" ondernemer viral`,
  ]

  const resultaten: string[] = []

  for (const query of queries) {
    try {
      const startRes = await fetch(
        `https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=${token}&memory=256`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries: query, resultsPerPage: 6, maxPagesPerQuery: 1, languageCode: 'nl' }),
        }
      )
      if (!startRes.ok) continue
      const run = await startRes.json()
      const runId = run?.data?.id
      if (!runId) continue

      for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, 8000))
        const pd = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`).then(r => r.json())
        if (pd?.data?.status === 'SUCCEEDED') {
          const items = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=6`).then(r => r.json())
          if (Array.isArray(items)) {
            const snippets = (items as Array<{ title?: string; snippet?: string }>)
              .slice(0, 4)
              .map(r => `${r.title}: ${r.snippet}`)
              .join('\n')
            resultaten.push(snippets)
          }
          break
        }
        if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(pd?.data?.status)) break
      }
    } catch { continue }
  }

  return resultaten.length
    ? `\nACTUELE SOCIALE MEDIA TRENDS (gebruik voor haak-formules en post-tijdstip):\n${resultaten.join('\n---\n')}`
    : ''
}

// ─── Campaign learnings voor marketing ────────────────────────────────────────
async function haalMarketingLearnings(productType: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('campaign_learnings')
    .select('beste_kanaal, wat_werkte, email_open_rate, conversie_rate')
    .eq('product_type', productType)
    .order('conversie_rate', { ascending: false })
    .limit(5)

  if (!data?.length) return ''
  return `\nWAT EERDER WERKTE voor ${productType}:\n${data.map(l =>
    `- Kanaal: ${l.beste_kanaal}, open rate: ${l.email_open_rate}%, conversie: ${l.conversie_rate}%: ${l.wat_werkte}`
  ).join('\n')}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { run_id } = await req.json()

  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .select('*, product_ideas(*)')
    .eq('id', run_id)
    .single()

  if (!run?.product_idea_id) return NextResponse.json({ error: 'Geen product idea' }, { status: 400 })

  const idee = run.product_ideas as Record<string, string>

  // Log analytics
  await supabaseAdmin.from('pipeline_analytics').insert({
    run_id, product_idea_id: run.product_idea_id, event_type: 'stap_goedgekeurd', stap: 1,
    metadata: { product_naam: idee.naam, product_type: idee.type },
  })

  // Sociale trends + learnings parallel ophalen
  const [socialeTrends, marketingLearnings] = await Promise.all([
    haalSocialeTrends(idee.doelgroep, idee.pijnpunt),
    haalMarketingLearnings(idee.type),
  ])

  // Claude bouwt marketing blueprint met actuele trends ingebakken.
  // ICP: zo specifiek dat je de persoon kunt tekenen.
  // Email: pain→amplify→solution structuur, bewezen open rates.
  // Social: platform-specifieke haak-formules gebaseerd op wat nu trending is.
  const prompt = `Je bent een B2B marketing strateeg. Maak een volledig marketing plan voor dit AI-product.

Product: ${idee.naam} — ${idee.tagline}
Beschrijving: ${idee.beschrijving}
Doelgroep: ${idee.doelgroep}
Pijnpunt: ${idee.pijnpunt}
Type: ${idee.type}
Prijs: ${idee.prijsindicatie}
${socialeTrends}
${marketingLearnings}

Geef JSON:
{
  "icp": {
    "functietitel": "exacte functie/rol",
    "sector": "branche",
    "bedrijfsgrootte": "1-5 / 5-15 / 15-50 medewerkers",
    "locatie": "Nederland — focus steden/regio",
    "leeftijd": "X-Y jaar",
    "tech_niveau": "laag/gemiddeld/hoog",
    "dagelijkse_frustratie": "concreet scenario: 'Elke maandag besteed ik 3 uur aan...'",
    "beslisser": true,
    "budget_tools": "€X-Y per maand voor software",
    "vindt_oplossingen_via": "LinkedIn/Google/collega/etc"
  },
  "email_strategie": {
    "toon": "informeel/professioneel/direct",
    "sequentie": [
      { "dag": 1, "onderwerp": "prikkelend onderwerp max 50 tekens", "haak": "eerste zin die stopt met scrollen", "structuur": "pain hook", "doel": "reply uitlokken" },
      { "dag": 4, "onderwerp": "...", "haak": "...", "structuur": "amplify + bewijs", "doel": "interesse verdiepen" },
      { "dag": 10, "onderwerp": "...", "haak": "...", "structuur": "oplossing + CTA", "doel": "demo/aankoop" }
    ],
    "cta": "concrete actie",
    "beste_verzendtijden": "dag + tijd"
  },
  "social_plan": {
    "linkedin": {
      "post_types": ["educatief", "pijnpunt", "bewijs", "behind-scenes"],
      "frequentie": "X per week",
      "beste_tijdstip": "dag hh:mm",
      "haak_formule": "concrete openingszin structuur gebaseerd op actuele trends",
      "trending_themas": ["thema uit social trends data"]
    },
    "meta": {
      "campagne_doel": "awareness/leads/conversie",
      "ad_formaat": "video/carousel/single image",
      "doelgroep_targeting": "interesses + gedragingen in Meta",
      "budget_indicatie": "€X/dag",
      "creatief_concept": "visueel idee dat converteert"
    },
    "instagram": {
      "content_mix": "X% educatief, Y% entertainment, Z% promotie",
      "beste_formats": ["reel", "carrousel", "story"],
      "hashtag_strategie": "mix groot/midden/niche"
    }
  },
  "key_messages": [
    "kernboodschap 1 (max 10 woorden, actief)",
    "kernboodschap 2",
    "kernboodschap 3",
    "kernboodschap 4",
    "kernboodschap 5"
  ],
  "zoekwoorden": {
    "primair": ["zoekwoord 1", "zoekwoord 2"],
    "long_tail": ["long tail 1"],
    "negatief": ["uitsluiten 1"]
  },
  "onderscheidend_vermogen": "1 zin: wat maakt dit uniek"
}
Alleen JSON.`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  let plan: Record<string, unknown>
  try {
    plan = JSON.parse(strip((msg.content[0] as { text: string }).text))
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 500 })
  }

  const { error } = await supabaseAdmin.from('marketing_plans').insert({
    run_id,
    product_idea_id: run.product_idea_id,
    icp: plan.icp,
    email_strategie: plan.email_strategie,
    social_plan: plan.social_plan,
    key_messages: plan.key_messages,
    zoekwoorden: plan.zoekwoorden,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('pipeline_runs')
    .update({ status: 'wacht_op_goedkeuring', huidige_stap: 2 })
    .eq('id', run_id)

  return NextResponse.json({ ok: true })
}
