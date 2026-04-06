export const maxDuration = 300

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

// ─── Apify Google Maps scraper ─────────────────────────────────────────────────
// Gebruikt het ICP (sector + locatie) als input voor Google Maps zoekopdrachten.
// Haalt naam, adres, website, telefoon op. Meerdere plaatsen in één batch
// zodat we genoeg volume hebben voor een goede outreach lijst.
async function zoekBedrijvenGoogleMaps(
  zoekterm: string,
  plaatsen: string[]
): Promise<Array<{ naam: string; adres: string; website?: string; telefoon?: string }>> {
  const token = process.env.APIFY_TOKEN
  if (!token) return mockBedrijven(zoekterm, plaatsen[0])

  const results: Array<{ naam: string; adres: string; website?: string; telefoon?: string }> = []

  for (const plaats of plaatsen.slice(0, 3)) {
    try {
      const startRes = await fetch(
        `https://api.apify.com/v2/acts/compass~google-maps-scraper/runs?token=${token}&memory=512`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchStringsArray: [`${zoekterm} ${plaats} Nederland`],
            maxCrawledPlacesPerSearch: 10,
            language: 'nl',
            countryCode: 'nl',
          }),
        }
      )
      if (!startRes.ok) continue
      const run = await startRes.json()
      const runId = run?.data?.id
      if (!runId) continue

      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 10000))
        const pd = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`).then(r => r.json())
        if (pd?.data?.status === 'SUCCEEDED') {
          const items = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=10`).then(r => r.json())
          if (Array.isArray(items)) {
            for (const p of items) {
              if (p.title) results.push({ naam: p.title, adres: p.address || '', website: p.website, telefoon: p.phone })
            }
          }
          break
        }
        if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(pd?.data?.status)) break
      }
    } catch { continue }
  }
  return results
}

// Fallback als APIFY_TOKEN niet gezet is
function mockBedrijven(zoekterm: string, plaats: string) {
  return [
    { naam: `${zoekterm.charAt(0).toUpperCase() + zoekterm.slice(1)} Voorbeeld BV`, adres: `Hoofdstraat 1, ${plaats}`, website: undefined, telefoon: '06-00000000' },
    { naam: `${zoekterm} Twente`, adres: `Industrieweg 5, ${plaats}`, website: 'https://example.com', telefoon: '053-0000000' },
  ]
}

// ─── Claude bepaalt zoektermen + plaatsen uit ICP ─────────────────────────────
async function icpNaarZoekTermen(icp: Record<string, string>): Promise<{ zoekterm: string; plaatsen: string[] }> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Vertaal dit ICP naar een Google Maps zoekterm en 5 Nederlandse steden/regio's.

ICP:
- Sector: ${icp.sector}
- Functietitel: ${icp.functietitel}
- Locatie: ${icp.locatie}
- Bedrijfsgrootte: ${icp.bedrijfsgrootte}

Geef JSON: { "zoekterm": "korte zoekterm (1-2 woorden, bijv. 'loodgieter')", "plaatsen": ["Amsterdam", "Rotterdam", ...] }
Alleen JSON.`,
    }],
  })
  try {
    return JSON.parse(strip((msg.content[0] as { text: string }).text))
  } catch {
    return { zoekterm: icp.sector || 'ondernemer', plaatsen: ['Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven', 'Groningen'] }
  }
}

// ─── Claude beoordeelt prospect kwaliteit ─────────────────────────────────────
async function beoordeelProspects(
  bedrijven: Array<{ naam: string; adres: string; website?: string; telefoon?: string }>,
  idee: Record<string, string>,
  icp: Record<string, string>
) {
  const lijst = bedrijven.map((b, i) => `${i + 1}. ${b.naam} (${b.adres}) — website: ${b.website || 'GEEN'}`).join('\n')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Beoordeel deze bedrijven als prospects voor: ${idee.naam} (${idee.beschrijving})
Doelgroep: ${icp.functietitel} in ${icp.sector}

Bedrijven:
${lijst}

Geef voor elk bedrijf een score en notitie:
[{ "index": 1, "score": 1-10, "notitie": "1 zin waarom goed/slecht prospect", "prioriteit": "hoog/middel/laag" }]

Score: 10 = perfecte prospect (klein, geen/slechte website, past bij pijnpunt). Alleen JSON.`,
    }],
  })

  try {
    return JSON.parse(strip((msg.content[0] as { text: string }).text)) as Array<{ index: number; score: number; notitie: string; prioriteit: string }>
  } catch {
    return bedrijven.map((_, i) => ({ index: i + 1, score: 5, notitie: 'Analyse mislukt', prioriteit: 'middel' }))
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { run_id } = await req.json()

  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .select('*, product_ideas(*)')
    .eq('id', run_id)
    .single()

  const { data: marketingPlan } = await supabaseAdmin
    .from('marketing_plans')
    .select('*')
    .eq('run_id', run_id)
    .single()

  if (!run?.product_idea_id || !marketingPlan) return NextResponse.json({ error: 'Missende data' }, { status: 400 })

  const idee = run.product_ideas as Record<string, string>
  const icp = (marketingPlan.icp as Record<string, string>) || {}

  // Claude bepaalt zoekterm en plaatsen op basis van ICP
  const { zoekterm, plaatsen } = await icpNaarZoekTermen(icp)

  // Google Maps scraper
  const bedrijven = await zoekBedrijvenGoogleMaps(zoekterm, plaatsen)

  if (!bedrijven.length) {
    await supabaseAdmin.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 5 }).eq('id', run_id)
    return NextResponse.json({ ok: true, leads: 0, bericht: 'Geen bedrijven gevonden' })
  }

  // Deduplicatie: sla al bekende bedrijven over
  const { data: bestaand } = await supabaseAdmin
    .from('pipeline_leads')
    .select('bedrijfsnaam')
    .in('bedrijfsnaam', bedrijven.map(b => b.naam))

  const bestaandeNamen = new Set((bestaand || []).map((b: { bedrijfsnaam: string }) => b.bedrijfsnaam))
  const nieuweBedrijven = bedrijven.filter(b => !bestaandeNamen.has(b.naam))

  if (!nieuweBedrijven.length) {
    await supabaseAdmin.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 5 }).eq('id', run_id)
    return NextResponse.json({ ok: true, leads: 0, bericht: 'Alle bedrijven al bekend' })
  }

  // Claude beoordeelt kwaliteit
  const beoordelingen = await beoordeelProspects(nieuweBedrijven, idee, icp)

  const inserts = nieuweBedrijven.map((b, i) => {
    const beoordeling = beoordelingen.find(x => x.index === i + 1) || { score: 5, notitie: '', prioriteit: 'middel' }
    return {
      run_id,
      product_idea_id: run.product_idea_id,
      bedrijfsnaam: b.naam,
      sector: icp.sector,
      plaats: plaatsen[Math.floor(i / 10)] || plaatsen[0],
      website: b.website || null,
      telefoon: b.telefoon || null,
      bron: 'google_maps',
      kwaliteit_score: beoordeling.score,
      notitie: `${beoordeling.notitie} [${beoordeling.prioriteit}]`,
    }
  })

  // Sorteer: beste leads eerst
  inserts.sort((a, b) => (b.kwaliteit_score || 0) - (a.kwaliteit_score || 0))

  const { error } = await supabaseAdmin.from('pipeline_leads').insert(inserts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('pipeline_runs')
    .update({ status: 'wacht_op_goedkeuring', huidige_stap: 5 })
    .eq('id', run_id)

  return NextResponse.json({ ok: true, leads: inserts.length, zoekterm, plaatsen })
}
