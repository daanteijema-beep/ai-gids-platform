// Supabase Edge Function: marketing-plan
// Draait op Deno — geen 60s timeout, max 150s
// Vervangt /api/agents/marketing-plan voor zware AI + Apify taken

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function strip(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]).catch(() => fallback)
}

async function haalLinkedInData(doelgroep: string): Promise<string> {
  const token = Deno.env.get('APIFY_TOKEN')
  if (!token) return ''
  try {
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=${token}&memory=256`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: `site:linkedin.com/posts "${doelgroep}" AI automatisering Nederland 2026`,
          resultsPerPage: 5, maxPagesPerQuery: 1, languageCode: 'nl',
        }),
      }
    )
    if (!startRes.ok) return ''
    const run = await startRes.json()
    const runId = run?.data?.id
    if (!runId) return ''

    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const pd = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`).then(r => r.json())
      if (pd?.data?.status === 'SUCCEEDED') {
        const items = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=5`).then(r => r.json())
        if (Array.isArray(items) && items.length) {
          return `\nACTUELE LINKEDIN DATA over "${doelgroep}":\n` +
            (items as Array<{ title?: string; snippet?: string }>)
              .slice(0, 4).map(r => `- ${r.title}: ${r.snippet}`).join('\n')
        }
      }
      if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(pd?.data?.status)) break
    }
  } catch { /* skip */ }
  return ''
}

async function haalMarketingLearnings(productType: string): Promise<string> {
  const { data } = await supabase
    .from('campaign_learnings')
    .select('beste_kanaal, wat_werkte, email_open_rate, conversie_rate')
    .eq('product_type', productType)
    .order('conversie_rate', { ascending: false })
    .limit(5)

  if (!data?.length) return ''
  return `\nWAT EERDER WERKTE voor ${productType}:\n${data.map((l: Record<string, unknown>) =>
    `- Kanaal: ${l.beste_kanaal}, open rate: ${l.email_open_rate}%, conversie: ${l.conversie_rate}%: ${l.wat_werkte}`
  ).join('\n')}`
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  if (auth !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { run_id } = await req.json()

  async function markeerFout(reden: string) {
    await supabase.from('pipeline_runs').update({ status: 'afgewezen', afgewezen_reden: reden }).eq('id', run_id)
  }

  const { data: run } = await supabase
    .from('pipeline_runs')
    .select('*, product_ideas(*)')
    .eq('id', run_id)
    .single()

  if (!run?.product_idea_id) {
    return new Response(JSON.stringify({ error: 'Geen product idea' }), { status: 400 })
  }

  const idee = run.product_ideas as Record<string, string>

  try {
    await supabase.from('pipeline_analytics').insert({
      run_id, product_idea_id: run.product_idea_id, event_type: 'stap_gestart', stap: 2,
      metadata: { product_naam: idee.naam, product_type: idee.type },
    })

    const [linkedinData, marketingLearnings] = await Promise.all([
      withTimeout(haalLinkedInData(idee.doelgroep), 25000, ''),
      haalMarketingLearnings(idee.type),
    ])

    const prompt = `Je bent een fractional CMO gespecialiseerd in B2B SaaS voor het Nederlandse MKB.
Gebruik de volgende bewezen marketing frameworks om een concreet plan te maken.

PRODUCT:
Naam: ${idee.naam} — ${idee.tagline}
Beschrijving: ${idee.beschrijving}
Doelgroep: ${idee.doelgroep}
Pijnpunt: ${idee.pijnpunt}
Type: ${idee.type}
Prijs: ${idee.prijsindicatie}
${linkedinData}
${marketingLearnings}

FRAMEWORK 1 — ICP (Ideal Customer Profile):
Definieer één specifiek persoon. Zo specifiek dat je ze kunt opbellen.

FRAMEWORK 2 — Positionering (CMO Advisor template):
"Voor [doelklant] die [behoefte heeft], is [productnaam] een [categorie] die [kernvoordeel biedt].
Anders dan [alternatief], biedt ons product [primaire differentiatie]."

FRAMEWORK 3 — Email sequentie (drip-structuur):
- Dag 1: Pain hook — raak het pijnpunt, geen pitch. Doel: reply uitlokken.
- Dag 4: Amplify + bewijs — vergroot urgentie met concreet voorbeeld.
- Dag 10: Oplossing + zachte CTA — presenteer product als logische stap.

FRAMEWORK 4 — Meta Ads (Advantage+ structuur):
Één campagne per doel. Advantage+ Audience voor brede targeting.
Naming: META_[Doel]_[Doelgroep]_[Aanbod]_2026

FRAMEWORK 5 — TOFU/MOFU/BOFU funnel:
- TOFU: LinkedIn thought leadership, SEO informatief
- MOFU: Retargeting, gated content, email nurture
- BOFU: Direct outreach, gratis demo, case studies

Geef JSON (alleen JSON):
{
  "icp": {
    "functietitel": "exacte rol",
    "sector": "specifieke branche",
    "bedrijfsgrootte": "1-5 / 5-15 / 15-50 medewerkers",
    "locatie": "focus regio Nederland",
    "leeftijd": "X-Y jaar",
    "tech_niveau": "laag/gemiddeld/hoog",
    "dagelijkse_frustratie": "concreet: 'Elke vrijdag besteed ik 2 uur aan...'",
    "beslisser": true,
    "budget_tools": "€X-Y/maand",
    "vindt_oplossingen_via": "LinkedIn/Google/collega/vakblad"
  },
  "positionering": "Ingevuld positioneringsstatement",
  "email_strategie": {
    "toon": "informeel/professioneel/direct",
    "sequentie": [
      { "dag": 1, "onderwerp": "max 50 tekens", "haak": "eerste zin die stopt met scrollen", "structuur": "pain hook", "doel": "reply uitlokken" },
      { "dag": 4, "onderwerp": "...", "haak": "...", "structuur": "amplify + bewijs", "doel": "urgentie vergroten" },
      { "dag": 10, "onderwerp": "...", "haak": "...", "structuur": "oplossing + zachte CTA", "doel": "demo/aankoop" }
    ],
    "cta": "concrete actie",
    "beste_verzendtijden": "dag + tijd"
  },
  "social_plan": {
    "linkedin": {
      "post_types": ["educatief", "pijnpunt", "bewijs", "behind-scenes"],
      "frequentie": "X per week",
      "beste_tijdstip": "dag hh:mm",
      "haak_formule": "concrete openingszin structuur",
      "tofu_themas": ["thema 1", "thema 2"],
      "bofu_themas": ["thema 1"]
    },
    "meta": {
      "campagne_naam": "META_Leads_[Doelgroep]_[Aanbod]_2026",
      "campagne_doel": "leads/conversie",
      "ad_set": "Advantage+ Audience",
      "ad_formaat": "video/carousel/single image",
      "budget_indicatie": "€X/dag",
      "creatief_concept": "visueel concept"
    },
    "instagram": {
      "content_mix": "X% educatief, Y% bewijs, Z% promotie",
      "beste_formats": ["reel", "carrousel", "story"],
      "hashtag_strategie": "mix groot/midden/niche"
    }
  },
  "key_messages": ["boodschap 1", "boodschap 2", "boodschap 3", "boodschap 4", "boodschap 5"],
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
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    let plan: Record<string, unknown>
    try {
      plan = JSON.parse(strip((msg.content[0] as { text: string }).text))
    } catch {
      await markeerFout('Claude gaf geen geldige JSON terug')
      return new Response(JSON.stringify({ error: 'Ongeldige JSON' }), { status: 500 })
    }

    const { error } = await supabase.from('marketing_plans').insert({
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
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 2 }).eq('id', run_id)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })

  } catch (e) {
    const reden = e instanceof Error ? e.message : String(e)
    console.error('Marketing plan edge function crash:', reden)
    await markeerFout(`Agent crash: ${reden}`)
    return new Response(JSON.stringify({ error: reden }), { status: 500 })
  }
})
