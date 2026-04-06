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

    const prompt = `Je bent een fractional CMO gespecialiseerd in B2B SaaS voor het Nederlandse MKB.
Gebruik de volgende bewezen marketing frameworks om een concreet plan te maken.

PRODUCT:
Naam: ${idee.naam} — ${idee.tagline}
Beschrijving: ${idee.beschrijving}
Doelgroep: ${idee.doelgroep}
Pijnpunt: ${idee.pijnpunt}
Type: ${idee.type}
Prijs: ${idee.prijsindicatie}
${marketingLearnings}

FRAMEWORK 1 — ICP (Ideal Customer Profile):
Definieer één specifiek persoon, niet een breed segment. Zo specifiek dat je ze kunt opbellen.

FRAMEWORK 2 — Positionering (CMO Advisor template):
"Voor [doelklant] die [behoefte/probleem heeft], is [productnaam] een [categorie] die [kernvoordeel biedt].
Anders dan [alternatief], biedt ons product [primaire differentiatie]."

FRAMEWORK 3 — Email sequentie (Email Marketing drip-structuur):
- Dag 1: Pain hook — raak het pijnpunt, geen pitch. Doel: reply uitlokken.
- Dag 4: Amplify + bewijs — vergroot urgentie met concreet voorbeeld/statistiek.
- Dag 10: Oplossing + CTA — presenteer product als logische stap, zachte CTA.
Onderwerpen: max 50 tekens, geen spam-woorden, persoonlijk.

FRAMEWORK 4 — Meta Ads (Advantage+ structuur):
Campaign → Ad Set → Ad. Één doel per campagne.
Gebruik Advantage+ Audience voor brede targeting, laat algoritme optimaliseren.
Naming: META_[Doel]_[Doelgroep]_[Aanbod]_[Datum]

FRAMEWORK 5 — Full-funnel (TOFU/MOFU/BOFU):
- TOFU (Awareness): LinkedIn thought leadership, SEO informatief
- MOFU (Consideration): Retargeting, gated content, email nurture
- BOFU (Decision): Direct outreach, gratis demo/proef, case studies

Geef JSON (alleen JSON, geen tekst eromheen):
{
  "icp": {
    "functietitel": "exacte rol, bijv. 'zelfstandig installateur'",
    "sector": "specifieke branche",
    "bedrijfsgrootte": "1-5 / 5-15 / 15-50 medewerkers",
    "locatie": "focus regio Nederland",
    "leeftijd": "X-Y jaar",
    "tech_niveau": "laag/gemiddeld/hoog",
    "dagelijkse_frustratie": "concreet: 'Elke vrijdag besteed ik 2 uur aan...'",
    "beslisser": true,
    "budget_tools": "€X-Y/maand voor software",
    "vindt_oplossingen_via": "LinkedIn/Google/collega/vakblad/etc"
  },
  "positionering": "Ingevuld positioneringsstatement op basis van CMO Advisor template",
  "email_strategie": {
    "toon": "informeel/professioneel/direct",
    "sequentie": [
      { "dag": 1, "onderwerp": "max 50 tekens — pain hook", "haak": "eerste zin die stopt met scrollen", "structuur": "pain hook — geen pitch", "doel": "reply uitlokken" },
      { "dag": 4, "onderwerp": "...", "haak": "...", "structuur": "amplify + bewijs/statistiek", "doel": "urgentie vergroten" },
      { "dag": 10, "onderwerp": "...", "haak": "...", "structuur": "oplossing + zachte CTA", "doel": "demo/aankoop" }
    ],
    "cta": "concrete actie (bijv. '15 min call')",
    "beste_verzendtijden": "dag + tijd"
  },
  "social_plan": {
    "linkedin": {
      "post_types": ["educatief", "pijnpunt", "bewijs", "behind-scenes"],
      "frequentie": "X per week",
      "beste_tijdstip": "dag hh:mm",
      "haak_formule": "concrete openingszin structuur die werkt voor deze doelgroep",
      "tofu_themas": ["TOFU idee 1", "TOFU idee 2"],
      "bofu_themas": ["BOFU idee 1"]
    },
    "meta": {
      "campagne_naam": "META_[Doel]_[Doelgroep]_[Aanbod]_2026",
      "campagne_doel": "leads/conversie",
      "ad_set": "Advantage+ Audience — breed, laat algoritme optimaliseren",
      "ad_formaat": "video/carousel/single image",
      "budget_indicatie": "€X/dag",
      "creatief_concept": "visueel concept dat converteert voor deze doelgroep"
    },
    "instagram": {
      "content_mix": "X% educatief, Y% bewijs, Z% promotie",
      "beste_formats": ["reel", "carrousel", "story"],
      "hashtag_strategie": "mix groot/midden/niche — 8-12 per post"
    }
  },
  "key_messages": [
    "kernboodschap 1 (max 10 woorden, actief, BOFU)",
    "kernboodschap 2 (MOFU — bewijs/vergelijking)",
    "kernboodschap 3 (TOFU — pijnpunt herkenning)",
    "kernboodschap 4",
    "kernboodschap 5"
  ],
  "zoekwoorden": {
    "primair": ["zoekwoord 1", "zoekwoord 2"],
    "long_tail": ["long tail 1", "long tail 2"],
    "negatief": ["uitsluiten 1"]
  },
  "onderscheidend_vermogen": "1 zin: wat maakt dit uniek vs ChatGPT en generieke tools"
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
