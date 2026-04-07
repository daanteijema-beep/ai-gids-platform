// Supabase Edge Function: lead-gen-pipeline
// Deno runtime — 150s max.
// Google Places API → echte bedrijven per stad → Claude scoring.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

function strip(t: string) { return t.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim() }

type PlacesResult = {
  naam: string
  adres: string
  website: string | null
  telefoon: string | null
  rating: number | null
  plaats: string
}

async function zoekViaPlaats(zoekterm: string, stad: string): Promise<PlacesResult[]> {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
  if (!apiKey) return []

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating',
      },
      body: JSON.stringify({
        textQuery: `${zoekterm} ${stad}`,
        languageCode: 'nl',
        regionCode: 'NL',
        maxResultCount: 20,
      }),
    })

    if (!res.ok) {
      console.error('Google Places API fout:', res.status, await res.text())
      return []
    }

    const data = await res.json()
    return (data.places || []).map((p: Record<string, unknown>) => ({
      naam: (p.displayName as {text:string})?.text || '',
      adres: (p.formattedAddress as string) || '',
      website: (p.websiteUri as string) || null,
      telefoon: (p.nationalPhoneNumber as string) || null,
      rating: (p.rating as number) || null,
      plaats: stad,
    })).filter((p: PlacesResult) => p.naam)
  } catch (e) {
    console.error('Places fetch fout:', e)
    return []
  }
}

async function icpNaarZoekterm(icp: Record<string, string>): Promise<{ zoekterm: string; stad: string; fallback_zoekterm?: string }> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 200,
    messages: [{ role: 'user', content: `Vertaal dit ICP naar een Google Maps zoekterm en de beste stad om te zoeken.
Sector: ${icp.sector || ''}
Functietitel: ${icp.functietitel || ''}
Locatie: ${icp.locatie || 'Nederland'}

BELANGRIJK: Kies een zoekterm die je ECHT op Google Maps vindt als bedrijf met een adres.
ZZP'ers en freelancers staan NIET op Maps — zoek dan op het bedrijfstype dat ze vertegenwoordigt.
Voorbeeld: "ZZP timmerman" → gebruik "aannemersbedrijf" of "bouwbedrijf"
Voorbeeld: "freelance fotograaf" → gebruik "fotostudio" of "fotografiebedrijf"

JSON: { "zoekterm": "primaire zoekterm", "fallback_zoekterm": "bredere term als backup", "stad": "stad uit de locatie" }
Als locatie "Nederland" of meerdere steden: kies Amsterdam.
Alleen JSON.` }],
  })
  try { return JSON.parse(strip((msg.content[0] as {text:string}).text)) }
  catch { return { zoekterm: icp.sector || 'bedrijf', stad: 'Amsterdam' } }
}

async function scoreLeads(
  bedrijven: PlacesResult[],
  idee: Record<string, string>,
  icp: Record<string, string>
): Promise<Array<{ index: number; score: number; notitie: string; prioriteit: string }>> {
  const lijst = bedrijven.map((b, i) =>
    `${i + 1}. ${b.naam}${b.website ? ` (${b.website})` : ' (geen website)'} — ${b.adres}${b.rating ? ` ★${b.rating}` : ''}`
  ).join('\n')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 1500,
    messages: [{ role: 'user', content: `Beoordeel als prospect voor: ${idee.naam}
Pijnpunt: ${idee.pijnpunt}
Doelgroep: ${icp.functietitel || 'eigenaar'} in ${icp.sector}, ${icp.bedrijfsgrootte || '2-10 mw'}

Score 10 = perfect: klein bedrijf, eigenaar beslist zelf, past precies bij pijnpunt.
Geen of slechte website = hoger scoren voor web/marketing producten.

${lijst}

[{"index":1,"score":1-10,"notitie":"1 zin waarom","prioriteit":"hoog/middel/laag"}]
Alleen JSON array.` }],
  })
  try { return JSON.parse(strip((msg.content[0] as {text:string}).text)) }
  catch { return bedrijven.map((_, i) => ({ index: i + 1, score: 5, notitie: '', prioriteit: 'middel' })) }
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
    const { data: run } = await supabase
      .from('pipeline_runs')
      .select('*, product_ideas!pipeline_runs_product_idea_id_fkey(*)')
      .eq('id', run_id)
      .single()

    const { data: marketingPlan } = await supabase
      .from('marketing_plans')
      .select('*')
      .eq('run_id', run_id)
      .single()

    if (!run?.product_idea_id || !marketingPlan) {
      return new Response(JSON.stringify({ error: 'Missende data' }), { status: 400 })
    }

    const idee = run.product_ideas as Record<string, string>
    const icp = (marketingPlan.icp as Record<string, string>) || {}

    if (!Deno.env.get('GOOGLE_PLACES_API_KEY')) {
      // Geen API key → stap overslaan, pipeline gaat door
      await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 5 }).eq('id', run_id)
      return new Response(JSON.stringify({ ok: true, leads: 0, bericht: 'Geen GOOGLE_PLACES_API_KEY — stap overgeslagen' }), { status: 200 })
    }

    const { zoekterm, stad, fallback_zoekterm } = await icpNaarZoekterm(icp)
    console.log(`Lead gen: "${zoekterm}" in ${stad}`)

    let bedrijven = await zoekViaPlaats(zoekterm, stad)

    // Fallback zoekterm als primaire 0 resultaten geeft
    if (!bedrijven.length && fallback_zoekterm) {
      console.log(`Fallback: "${fallback_zoekterm}" in ${stad}`)
      bedrijven = await zoekViaPlaats(fallback_zoekterm, stad)
    }

    if (!bedrijven.length) {
      await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 5 }).eq('id', run_id)
      return new Response(JSON.stringify({ ok: true, leads: 0, bericht: 'Geen resultaten van Google Places' }), { status: 200 })
    }

    // Deduplicatie
    const { data: bestaand } = await supabase
      .from('pipeline_leads').select('bedrijfsnaam')
      .in('bedrijfsnaam', bedrijven.map(b => b.naam))
    const bestaandeNamen = new Set((bestaand || []).map((b: {bedrijfsnaam:string}) => b.bedrijfsnaam))
    const nieuw = bedrijven.filter(b => !bestaandeNamen.has(b.naam))

    if (!nieuw.length) {
      await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 5 }).eq('id', run_id)
      return new Response(JSON.stringify({ ok: true, leads: 0, bericht: 'Alle bedrijven al in database' }), { status: 200 })
    }

    const scores = await scoreLeads(nieuw, idee, icp)

    const inserts = nieuw.map((b, i) => {
      const s = scores.find(x => x.index === i + 1) || { score: 5, notitie: '', prioriteit: 'middel' }
      return {
        run_id,
        product_idea_id: run.product_idea_id,
        bedrijfsnaam: b.naam,
        sector: icp.sector,
        plaats: stad,
        website: b.website,
        telefoon: b.telefoon,
        bron: 'google_maps',
        kwaliteit_score: s.score,
        notitie: `${s.notitie} [${s.prioriteit}]`,
      }
    }).sort((a, b) => (b.kwaliteit_score || 0) - (a.kwaliteit_score || 0))

    const { error } = await supabase.from('pipeline_leads').insert(inserts)
    if (error) {
      await markeerFout(`DB insert: ${error.message}`)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 5 }).eq('id', run_id)
    return new Response(JSON.stringify({ ok: true, leads: inserts.length, zoekterm, stad, bron: 'google_maps' }), { status: 200 })

  } catch (e) {
    const reden = e instanceof Error ? e.message : String(e)
    await markeerFout(`Agent crash: ${reden}`)
    return new Response(JSON.stringify({ error: reden }), { status: 500 })
  }
})
