// Supabase Edge Function: lead-gen-pipeline
// Deno runtime — 150s max. Apify Google Maps scraper voor ICP-matching leads.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

function strip(t: string) { return t.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim() }

async function icpNaarZoekTermen(icp: Record<string, string>): Promise<{ zoekterm: string; plaatsen: string[] }> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 300,
    messages: [{ role: 'user', content: `Vertaal dit ICP naar een Google Maps zoekterm en 5 Nederlandse steden/regio's.
ICP:
- Sector: ${icp.sector}
- Functietitel: ${icp.functietitel}
- Locatie: ${icp.locatie}
- Bedrijfsgrootte: ${icp.bedrijfsgrootte}
Geef JSON: { "zoekterm": "1-2 woorden, bijv. 'loodgieter'", "plaatsen": ["Amsterdam", "Rotterdam", ...] }
Alleen JSON.` }],
  })
  try { return JSON.parse(strip((msg.content[0] as {text:string}).text)) }
  catch { return { zoekterm: icp.sector || 'ondernemer', plaatsen: ['Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven', 'Groningen'] } }
}

async function zoekBedrijven(zoekterm: string, plaatsen: string[]) {
  const token = Deno.env.get('APIFY_TOKEN')
  if (!token) return []

  const results: Array<{ naam: string; adres: string; website?: string; telefoon?: string; plaats: string }> = []

  for (const plaats of plaatsen.slice(0, 3)) {
    try {
      const startRes = await fetch(
        `https://api.apify.com/v2/acts/compass~google-maps-scraper/runs?token=${token}&memory=512`,
        {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchStringsArray: [`${zoekterm} ${plaats} Nederland`],
            maxCrawledPlacesPerSearch: 12, language: 'nl', countryCode: 'nl',
          }),
        }
      )
      if (!startRes.ok) continue
      const run = await startRes.json()
      const runId = run?.data?.id
      if (!runId) continue

      // Supabase heeft 150s — 10 polls × 10s = 100s per stad (3 steden = 300s, te lang)
      // Gebruik 6 polls × 8s = 48s per stad → 3 steden = 144s ✓
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 8000))
        const pd = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`).then(r => r.json())
        if (pd?.data?.status === 'SUCCEEDED') {
          const items = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=12`).then(r => r.json())
          if (Array.isArray(items)) {
            for (const p of items) {
              if (p.title) results.push({ naam: p.title, adres: p.address || '', website: p.website, telefoon: p.phone, plaats })
            }
          }
          break
        }
        if (['FAILED','ABORTED','TIMED-OUT'].includes(pd?.data?.status)) break
      }
    } catch { continue }
  }
  return results
}

async function beoordeelProspects(
  bedrijven: Array<{ naam: string; adres: string; website?: string; telefoon?: string; plaats: string }>,
  idee: Record<string, string>, icp: Record<string, string>
) {
  const lijst = bedrijven.map((b, i) => `${i + 1}. ${b.naam} (${b.adres}) — website: ${b.website || 'GEEN'}`).join('\n')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 1500,
    messages: [{ role: 'user', content: `Beoordeel deze bedrijven als prospects voor: ${idee.naam} (${idee.beschrijving})
Doelgroep: ${icp.functietitel} in ${icp.sector}
Pijnpunt dat we oplossen: ${idee.pijnpunt}

Bedrijven:
${lijst}

Score 10 = perfect (klein bedrijf, geen/slechte website, past precies bij pijnpunt).
Score 1 = slechte fit (groot bedrijf, heeft al moderne website, verkeerde sector).

[{ "index": 1, "score": 1-10, "notitie": "1 zin waarom", "prioriteit": "hoog/middel/laag" }]
Alleen JSON.` }],
  })
  try { return JSON.parse(strip((msg.content[0] as {text:string}).text)) as Array<{index:number;score:number;notitie:string;prioriteit:string}> }
  catch { return bedrijven.map((_, i) => ({ index: i+1, score: 5, notitie: 'Analyse niet beschikbaar', prioriteit: 'middel' })) }
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

  try {
    const { data: run } = await supabase.from('pipeline_runs').select('*, product_ideas!pipeline_runs_product_idea_id_fkey(*)').eq('id', run_id).single()
    const { data: marketingPlan } = await supabase.from('marketing_plans').select('*').eq('run_id', run_id).single()

    if (!run?.product_idea_id || !marketingPlan) {
      return new Response(JSON.stringify({ error: 'Missende data' }), { status: 400 })
    }

    const idee = run.product_ideas as Record<string, string>
    const icp = (marketingPlan.icp as Record<string, string>) || {}

    const { zoekterm, plaatsen } = await icpNaarZoekTermen(icp)
    console.log(`Lead gen: zoekterm="${zoekterm}", plaatsen=${plaatsen.join(', ')}`)

    const bedrijven = await zoekBedrijven(zoekterm, plaatsen)

    if (!bedrijven.length) {
      await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 5 }).eq('id', run_id)
      return new Response(JSON.stringify({ ok: true, leads: 0, bericht: 'Geen bedrijven gevonden via Google Maps' }), { status: 200 })
    }

    // Deduplicatie
    const { data: bestaand } = await supabase.from('pipeline_leads').select('bedrijfsnaam').in('bedrijfsnaam', bedrijven.map(b => b.naam))
    const bestaandeNamen = new Set((bestaand || []).map((b: {bedrijfsnaam:string}) => b.bedrijfsnaam))
    const nieuw = bedrijven.filter(b => !bestaandeNamen.has(b.naam))

    if (!nieuw.length) {
      await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 5 }).eq('id', run_id)
      return new Response(JSON.stringify({ ok: true, leads: 0, bericht: 'Alle bedrijven al in database' }), { status: 200 })
    }

    const beoordelingen = await beoordeelProspects(nieuw, idee, icp)

    const inserts = nieuw.map((b, i) => {
      const beoordeling = beoordelingen.find(x => x.index === i + 1) || { score: 5, notitie: '', prioriteit: 'middel' }
      return {
        run_id,
        product_idea_id: run.product_idea_id,
        bedrijfsnaam: b.naam,
        sector: icp.sector,
        plaats: b.plaats,
        website: b.website || null,
        telefoon: b.telefoon || null,
        bron: 'google_maps',
        kwaliteit_score: beoordeling.score,
        notitie: `${beoordeling.notitie} [${beoordeling.prioriteit}]`,
      }
    }).sort((a, b) => (b.kwaliteit_score || 0) - (a.kwaliteit_score || 0))

    const { error } = await supabase.from('pipeline_leads').insert(inserts)
    if (error) { await markeerFout(`DB insert: ${error.message}`); return new Response(JSON.stringify({ error: error.message }), { status: 500 }) }

    await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 5 }).eq('id', run_id)
    return new Response(JSON.stringify({ ok: true, leads: inserts.length, zoekterm, plaatsen }), { status: 200 })

  } catch (e) {
    const reden = e instanceof Error ? e.message : String(e)
    await markeerFout(`Agent crash: ${reden}`)
    return new Response(JSON.stringify({ error: reden }), { status: 500 })
  }
})
