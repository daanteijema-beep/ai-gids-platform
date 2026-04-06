// Supabase Edge Function: research-ideas
// Deno runtime — 150s max. Twee fases: data verzamelen → analyseren → ideeën genereren.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

function strip(t: string) { return t.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim() }

async function withTimeout<T>(p: Promise<T>, ms: number, fb: T): Promise<T> {
  return Promise.race([p, new Promise<T>((_,r) => setTimeout(() => r(new Error('timeout')), ms))]).catch(() => fb)
}

async function haalLearnings() {
  const { data } = await supabase.from('campaign_learnings')
    .select('product_type, doelgroep, beste_kanaal, wat_werkte, wat_niet_werkte, conversie_rate')
    .order('created_at', { ascending: false }).limit(10)
  if (!data?.length) return ''
  return `EERDERE CAMPAGNE INZICHTEN:\n${data.map((l: Record<string,unknown>) =>
    `- ${l.product_type} voor ${l.doelgroep}: werkte=${l.wat_werkte}, kanaal=${l.beste_kanaal}`
  ).join('\n')}\nVermijd niches die al gedekt zijn. Focus op witte vlekken.`
}

async function haalEerdereIdeeen() {
  const { data } = await supabase.from('product_ideas')
    .select('naam, doelgroep, pijnpunt, geselecteerd').order('created_at', { ascending: false }).limit(30)
  if (!data?.length) return ''
  const gekozen = (data as Array<Record<string,unknown>>).filter(i => i.geselecteerd).map(i => `  ✓ ${i.naam} (${i.doelgroep})`)
  const afgewezen = (data as Array<Record<string,unknown>>).filter(i => !i.geselecteerd).map(i => `  ✗ ${i.naam} (${i.doelgroep}): ${i.pijnpunt}`)
  return `EERDER GEGENEREERDE IDEEËN — NIET HERHALEN:\n${[...gekozen, ...afgewezen].join('\n')}\nGenereer ideeën die qua sector, doelgroep EN pijnpunt totaal anders zijn.`
}

async function bepaalZoektermen(context: string): Promise<string[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 500,
    messages: [{ role: 'user', content: `Geef 6 zoektermen voor Reddit/LinkedIn voor AI-tool kansen voor kleine ondernemers in Nederland.
REGELS:
- Elke term dekt een ANDERE sector (bouw, zorg, horeca, transport, detailhandel, creatief, boekhouding, etc.)
- Mix Engels (voor Reddit) en Nederlands (voor LinkedIn)
- Focus op pijnpunten en tijdverspilling, niet op "AI"
${context}
JSON array van 6 strings. Alleen JSON.` }],
  })
  try { return JSON.parse(strip((msg.content[0] as {text:string}).text)) }
  catch { return ['AI automation small business', 'repetitive tasks freelancer', 'save time ZZP', 'workflow automation MKB', 'tijdsbesparing ondernemer', 'AI tool freelancer'] }
}

async function haalReddit(zoektermen: string[]) {
  const subs = ['smallbusiness', 'entrepreneur', 'freelance', 'Entrepreneur']
  const results: {bron:string;titel:string;tekst:string;score:number}[] = []
  for (const sub of subs) {
    // Gebruik 2 verschillende zoektermen per subreddit voor meer diversiteit
    const termIdx = Math.floor(Math.random() * (zoektermen.length - 1))
    for (const term of [zoektermen[termIdx], zoektermen[termIdx + 1]].filter(Boolean)) {
      try {
        const res = await fetch(`https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(term)}&sort=top&t=month&limit=8`,
          { headers: { 'User-Agent': 'VakwebTwente/1.0' } })
        if (!res.ok) continue
        const data = await res.json()
        for (const p of (data?.data?.children || []).slice(0, 4)) {
          const d = p.data
          if (d.score < 10) continue
          results.push({ bron: `reddit/r/${sub}`, titel: d.title, tekst: (d.selftext || d.title).slice(0, 600), score: d.score })
        }
      } catch { continue }
    }
  }
  // Sorteer op score, neem top 15
  return results.sort((a,b) => b.score - a.score).slice(0, 15)
}

async function haalProductHunt() {
  const token = Deno.env.get('PRODUCTHUNT_API_KEY')
  if (!token) return []
  try {
    const query = `{ posts(first: 20, topic: "artificial-intelligence", order: VOTES) { edges { node { name tagline description votesCount } } } }`
    const res = await fetch('https://api.producthunt.com/v2/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data?.data?.posts?.edges || []).map((e: {node:{name:string;tagline:string;description?:string;votesCount:number}}) => ({
      bron: 'producthunt',
      titel: `${e.node.name} — ${e.node.votesCount} upvotes`,
      tekst: `${e.node.tagline}. ${(e.node.description || '').slice(0, 400)}`,
      score: e.node.votesCount,
    }))
  } catch { return [] }
}

async function haalGoogleTrends(zoektermen: string[]) {
  const token = Deno.env.get('APIFY_TOKEN')
  if (!token) return []
  try {
    const startRes = await fetch(`https://api.apify.com/v2/acts/apify~google-trends-scraper/runs?token=${token}&memory=256`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchTerms: zoektermen.slice(0, 5), geo: 'NL', timeRange: 'now 30-d' }),
    })
    if (!startRes.ok) return []
    const run = await startRes.json()
    const runId = run?.data?.id
    if (!runId) return []
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const pd = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`).then(r => r.json())
      if (pd?.data?.status === 'SUCCEEDED') {
        const items = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=10`).then(r => r.json())
        return Array.isArray(items) && items.length
          ? [{ bron: 'google_trends', titel: 'Google Trends NL (30 dagen)', tekst: JSON.stringify(items.slice(0, 8)), score: 100 }] : []
      }
      if (['FAILED','ABORTED','TIMED-OUT'].includes(pd?.data?.status)) break
    }
  } catch { /* skip */ }
  return []
}

async function haalLinkedIn(zoektermen: string[]) {
  const token = Deno.env.get('APIFY_TOKEN')
  if (!token) return []
  try {
    // 2 zoekopdrachten parallel voor meer bereik
    const queries = [
      `site:linkedin.com/posts "${zoektermen[0]}" OR "${zoektermen[1]}" Nederland automatisering`,
      `site:linkedin.com/posts "${zoektermen[2]}" OR "${zoektermen[3]}" ZZP MKB 2025`,
    ]
    const startRes = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=${token}&memory=256`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries, resultsPerPage: 8, maxPagesPerQuery: 1, languageCode: 'nl' }),
    })
    if (!startRes.ok) return []
    const run = await startRes.json()
    const runId = run?.data?.id
    if (!runId) return []
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const pd = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`).then(r => r.json())
      if (pd?.data?.status === 'SUCCEEDED') {
        const items = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=12`).then(r => r.json())
        return Array.isArray(items)
          ? (items as Array<{title?:string;snippet?:string}>).slice(0,8).map(r => ({ bron:'linkedin', titel:r.title||'LinkedIn post', tekst:r.snippet||'', score: 50 }))
          : []
      }
      if (['FAILED','ABORTED','TIMED-OUT'].includes(pd?.data?.status)) break
    }
  } catch { /* skip */ }
  return []
}

// FASE 2: Claude analyseert alle ruwe data en trekt conclusies VOORDAT ideeën worden gegenereerd
async function analyseerMarktdata(bronData: {bron:string;titel:string;tekst:string}[], context: string, zoektermen: string[]) {
  const bronContext = bronData.map(d => `[${d.bron.toUpperCase()}]\n${d.titel}\n${d.tekst}`).join('\n\n---\n\n')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 1500,
    messages: [{ role: 'user', content: `Je bent een marktanalist. Analyseer deze ruwe marktdata over AI-tool kansen voor kleine ondernemers in Nederland.

Zoektermen gebruikt: ${zoektermen.join(', ')}

Ruwe data:
${bronContext.slice(0, 8000)}

Geef een gestructureerde analyse als JSON:
{
  "top_pijnpunten": [
    { "pijnpunt": "concreet pijnpunt", "bewijs": "letterlijk citaat of parafrase uit data", "bron": "welke bron", "urgentie": 1-10 }
  ],
  "trending_sectoren": ["sector1", "sector2", "sector3"],
  "witte_vlekken": ["niche die onderbedeeld is maar kansen heeft"],
  "wat_al_bestaat": ["tools/oplossingen die al populair zijn — vermijd deze"],
  "kansen_samenvatting": "2-3 zinnen: waar liggen de echte kansen op basis van de data"
}

Wees concreet. Citeer uit de data. Alleen JSON.` }],
  })
  try {
    return JSON.parse(strip((msg.content[0] as {text:string}).text))
  } catch {
    return null
  }
}

async function genereerIdeeen(bronData: {bron:string;titel:string;tekst:string}[], analyse: Record<string,unknown> | null, context: string, zoektermen: string[]) {
  const bronContext = bronData.map(d => `[${d.bron.toUpperCase()}]\n${d.titel}\n${d.tekst}`).join('\n\n---\n\n')
  const analyseContext = analyse ? `\nMARKTANALYSE (op basis van ruwe data):\n${JSON.stringify(analyse, null, 2)}\n` : ''

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 3000,
    messages: [{ role: 'user', content: `Je bent een productstrateeg voor AI-tools voor kleine ondernemers (ZZP, MKB) in Nederland.

${context}
${analyseContext}

Zoektermen deze run: ${zoektermen.join(', ')}

STAP 1 — Lees de marktanalyse hierboven goed door.
STAP 2 — Genereer 3 ideeën die DIRECT zijn gebaseerd op de top_pijnpunten en witte_vlekken uit de analyse.
STAP 3 — Elk idee moet ANDERS zijn:
- Idee 1: andere sector dan idee 2 en 3
- Idee 2: ander type taak dan idee 1 en 3
- Idee 3: andere doelgroep dan idee 1 en 2
- GEEN van de ideeën mag lijken op 'wat_al_bestaat' uit de analyse

Ruwe marktdata (voor markt_bewijs citaten):
${bronContext.slice(0, 5000)}

JSON array met 3 ideeën:
[{
  "naam": "max 4 woorden",
  "tagline": "wat het PRECIES doet in 6 woorden",
  "beschrijving": "2-3 zinnen: welke handeling, hoe, voor wie exact",
  "doelgroep": "SPECIFIEK: bijv. 'zelfstandig loodgieter 30-55 jaar'",
  "pijnpunt": "CONCREET: bijv. 'elke vrijdag 2 uur kwijt aan offertes'",
  "type": "mini_tool|agent|website|saas",
  "prijsindicatie": "€X/maand of €X eenmalig",
  "validatiescore": 1-10,
  "markt_bewijs": "citeer letterlijk fragment uit de marktdata of analyse",
  "onderscheidend": "wat dit anders maakt dan ChatGPT en bestaande tools"
}]
Alleen JSON.` }],
  })
  return JSON.parse(strip((msg.content[0] as {text:string}).text))
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
    await supabase.from('pipeline_analytics').insert({ run_id, event_type: 'run_gestart', stap: 1 })

    const [runData, learnings, eerdereIdeeen] = await Promise.all([
      supabase.from('pipeline_runs').select('notitie').eq('id', run_id).single(),
      haalLearnings(),
      haalEerdereIdeeen(),
    ])

    const gebruikerPrompt = runData.data?.notitie
      ? `\nGEBRUIKERSINSTRUCTIE (hoogste prioriteit):\n${runData.data.notitie}\n` : ''
    const contextBlok = [gebruikerPrompt, learnings, eerdereIdeeen].filter(Boolean).join('\n\n') || 'Eerste run.'

    const zoektermen = await bepaalZoektermen(contextBlok)

    // FASE 1: Alle bronnen parallel verzamelen — ruim de tijd voor Apify
    console.log('Fase 1: data verzamelen...')
    const [reddit, producthunt, trends, linkedin] = await Promise.all([
      haalReddit(zoektermen),
      haalProductHunt(),
      withTimeout(haalGoogleTrends(zoektermen), 45000, []),
      withTimeout(haalLinkedIn(zoektermen), 45000, []),
    ])

    const allData = [...reddit, ...producthunt, ...trends, ...linkedin]
    const bronnenGebruikt = [...new Set(allData.map(d => d.bron))]
    console.log(`Fase 1 klaar: ${allData.length} items van bronnen: ${bronnenGebruikt.join(', ')}`)

    // FASE 2: Analyseer de data voordat ideeën worden gegenereerd
    console.log('Fase 2: marktdata analyseren...')
    const analyse = await analyseerMarktdata(allData, contextBlok, zoektermen)
    console.log('Fase 2 klaar, analyse:', JSON.stringify(analyse)?.slice(0, 200))

    // FASE 3: Genereer ideeën op basis van de analyse
    console.log('Fase 3: ideeën genereren...')
    const ideeen = await genereerIdeeen(allData, analyse, contextBlok, zoektermen)

    const inserts = ideeen.map((idee: Record<string,unknown>) => ({
      run_id, naam: idee.naam, tagline: idee.tagline, beschrijving: idee.beschrijving,
      doelgroep: idee.doelgroep, pijnpunt: idee.pijnpunt, type: idee.type,
      prijsindicatie: idee.prijsindicatie, validatiescore: idee.validatiescore,
      bronnen: {
        gebruikt: bronnenGebruikt,
        markt_bewijs: idee.markt_bewijs,
        onderscheidend: idee.onderscheidend,
        zoektermen,
        analyse: analyse ? {
          top_pijnpunten: analyse.top_pijnpunten,
          trending_sectoren: analyse.trending_sectoren,
          witte_vlekken: analyse.witte_vlekken,
        } : null,
        brondata: allData.slice(0, 25).map(d => ({ bron: d.bron, titel: d.titel, tekst: d.tekst.slice(0, 400) })),
      },
    }))

    const { error } = await supabase.from('product_ideas').insert(inserts)
    if (error) { await markeerFout(`DB insert: ${error.message}`); return new Response(JSON.stringify({ error: error.message }), { status: 500 }) }

    await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 1 }).eq('id', run_id)
    return new Response(JSON.stringify({ ok: true, ideeen: ideeen.length, bronnen: bronnenGebruikt, analyse_beschikbaar: !!analyse }), { status: 200 })

  } catch (e) {
    const reden = e instanceof Error ? e.message : String(e)
    await markeerFout(`Agent crash: ${reden}`)
    return new Response(JSON.stringify({ error: reden }), { status: 500 })
  }
})
