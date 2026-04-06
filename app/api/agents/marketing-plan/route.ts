export const maxDuration = 60

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

  async function markeerFout(reden: string) {
    await supabaseAdmin
      .from('pipeline_runs')
      .update({ status: 'afgewezen', afgewezen_reden: reden })
      .eq('id', run_id)
  }

  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .select('*, product_ideas(*)')
    .eq('id', run_id)
    .single()

  if (!run?.product_idea_id) return NextResponse.json({ error: 'Geen product idea' }, { status: 400 })

  const idee = run.product_ideas as Record<string, string>

  try {
    await supabaseAdmin.from('pipeline_analytics').insert({
      run_id, product_idea_id: run.product_idea_id, event_type: 'stap_gestart', stap: 2,
      metadata: { product_naam: idee.naam, product_type: idee.type },
    })

    const marketingLearnings = await haalMarketingLearnings(idee.type)

    const prompt = `Je bent een B2B marketing strateeg. Maak een volledig marketing plan voor dit AI-product voor de Nederlandse markt.

Product: ${idee.naam} — ${idee.tagline}
Beschrijving: ${idee.beschrijving}
Doelgroep: ${idee.doelgroep}
Pijnpunt: ${idee.pijnpunt}
Type: ${idee.type}
Prijs: ${idee.prijsindicatie}
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
      "haak_formule": "concrete openingszin structuur"
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
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    let plan: Record<string, unknown>
    try {
      plan = JSON.parse(strip((msg.content[0] as { text: string }).text))
    } catch {
      await markeerFout('Claude gaf geen geldige JSON terug')
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

    if (error) {
      await markeerFout(`DB insert mislukt: ${error.message}`)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabaseAdmin
      .from('pipeline_runs')
      .update({ status: 'wacht_op_goedkeuring', huidige_stap: 2 })
      .eq('id', run_id)

    return NextResponse.json({ ok: true })

  } catch (e) {
    const reden = e instanceof Error ? e.message : String(e)
    console.error('Marketing plan agent crash:', reden)
    await markeerFout(`Agent crash: ${reden}`)
    return NextResponse.json({ error: reden }, { status: 500 })
  }
}
