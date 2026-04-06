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

// ─── Leerlogica: haalt op wat eerder werkte ────────────────────────────────────
// Voordat we zoeken, kijken we in campaign_learnings wat al bewezen heeft gewerkt.
// Dit voorkomt dat de agent steeds dezelfde ideeën genereert en stuurt hem
// richting onontgonnen markten of bewezen formaten.
async function haalLearnings(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('campaign_learnings')
    .select('product_type, doelgroep, beste_kanaal, wat_werkte, wat_niet_werkte, conversie_rate')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!data?.length) return 'Geen eerdere campagne data — genereer brede ideeën.'

  return `EERDERE CAMPAGNE INZICHTEN (gebruik dit om betere ideeën te genereren):
${data.map(l =>
  `- ${l.product_type} voor ${l.doelgroep}: werkte=${l.wat_werkte}, niet=${l.wat_niet_werkte}, kanaal=${l.beste_kanaal}, conversie=${l.conversie_rate || '?'}%`
).join('\n')}

Vermijd niches/types die al goed gedekt zijn. Focus op witte vlekken.`
}

// ─── Claude bepaalt dynamische zoektermen ─────────────────────────────────────
// In plaats van hardcoded zoektermen laat Claude eerst bepalen welke hoeken
// interessant zijn op basis van de learnings. Dit zorgt voor diversiteit.
async function bepaalZoektermen(learnings: string): Promise<string[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Je bent een marktonderzoeker. Geef 5 verschillende zoektermen voor Reddit/LinkedIn
om AI-tool kansen voor kleine ondernemers te vinden. Elke term moet een andere invalshoek pakken
(bijv. pijnpunt, sector, taak, tijdsverspilling).

${learnings}

Geef JSON array van 5 strings. Alleen JSON.`,
    }],
  })
  try {
    return JSON.parse(strip((msg.content[0] as { text: string }).text))
  } catch {
    return ['AI automation small business', 'repetitive tasks freelancer', 'save time ZZP', 'workflow automation MKB', 'AI tool entrepreneur']
  }
}

// ─── Bron 1: Reddit ────────────────────────────────────────────────────────────
async function haalReddit(zoektermen: string[]): Promise<{ bron: string; titel: string; tekst: string }[]> {
  const subs = ['smallbusiness', 'entrepreneur', 'freelance', 'Netherlands', 'digitalnomad']
  const results: { bron: string; titel: string; tekst: string }[] = []

  for (const sub of subs.slice(0, 3)) {
    const term = zoektermen[Math.floor(Math.random() * zoektermen.length)]
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(term)}&sort=top&t=month&limit=6`,
        { headers: { 'User-Agent': 'VakwebTwente/1.0' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      for (const p of (data?.data?.children || []).slice(0, 3)) {
        const d = p.data
        if (d.score < 5) continue
        results.push({ bron: `reddit/r/${sub}`, titel: d.title, tekst: (d.selftext || d.title).slice(0, 400) })
      }
    } catch { continue }
  }
  return results
}

// ─── Bron 2: ProductHunt via Firecrawl ────────────────────────────────────────
async function haalProductHunt(): Promise<{ bron: string; titel: string; tekst: string }[]> {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) return []
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        url: 'https://www.producthunt.com/topics/artificial-intelligence',
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    })
    if (!res.ok) return []
    const data = await res.json()
    const tekst = (data?.data?.markdown || '').slice(0, 3000)
    return tekst ? [{ bron: 'producthunt', titel: 'Trending AI tools op ProductHunt', tekst }] : []
  } catch { return [] }
}

// ─── Bron 3: Google Trends via Apify ──────────────────────────────────────────
async function haalGoogleTrends(zoektermen: string[]): Promise<{ bron: string; titel: string; tekst: string }[]> {
  const token = process.env.APIFY_TOKEN
  if (!token) return []
  try {
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/apify~google-trends-scraper/runs?token=${token}&memory=256`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerms: zoektermen.slice(0, 4), geo: 'NL', timeRange: 'now 30-d' }),
      }
    )
    if (!startRes.ok) return []
    const run = await startRes.json()
    const runId = run?.data?.id
    if (!runId) return []
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const pd = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`).then(r => r.json())
      if (pd?.data?.status === 'SUCCEEDED') {
        const items = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=10`).then(r => r.json())
        return Array.isArray(items) && items.length
          ? [{ bron: 'google_trends', titel: 'Google Trends NL — AI tools voor ondernemers', tekst: JSON.stringify(items.slice(0, 6)) }]
          : []
      }
      if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(pd?.data?.status)) break
    }
    return []
  } catch { return [] }
}

// ─── Bron 4: LinkedIn via Apify Google Search ──────────────────────────────────
async function haalLinkedIn(zoektermen: string[]): Promise<{ bron: string; titel: string; tekst: string }[]> {
  const token = process.env.APIFY_TOKEN
  if (!token) return []
  const term = zoektermen[0]
  try {
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=${token}&memory=256`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: `site:linkedin.com/posts "${term}" OR "automatisering" Nederland`,
          resultsPerPage: 8, maxPagesPerQuery: 1, languageCode: 'nl', countryCode: 'nl',
        }),
      }
    )
    if (!startRes.ok) return []
    const run = await startRes.json()
    const runId = run?.data?.id
    if (!runId) return []
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const pd = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`).then(r => r.json())
      if (pd?.data?.status === 'SUCCEEDED') {
        const items = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=8`).then(r => r.json())
        return Array.isArray(items)
          ? (items as Array<{ title?: string; snippet?: string }>).slice(0, 5).map(r => ({
              bron: 'linkedin', titel: r.title || 'LinkedIn post', tekst: r.snippet || '',
            }))
          : []
      }
      if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(pd?.data?.status)) break
    }
    return []
  } catch { return [] }
}

// ─── Claude genereert ideeën ───────────────────────────────────────────────────
async function genereerIdeeen(
  bronData: { bron: string; titel: string; tekst: string }[],
  learnings: string,
  zoektermen: string[]
) {
  const context = bronData.map(d => `[${d.bron.toUpperCase()}]\n${d.titel}\n${d.tekst}`).join('\n\n---\n\n')

  const prompt = `Je bent een productstrateeg gespecialiseerd in AI-tools voor kleine ondernemers (ZZP, MKB, freelancers) in Nederland.

${learnings}

Gebruikte zoektermen deze run: ${zoektermen.join(', ')}

Analyseer de marktdata en genereer 3 concrete productideeën voor AI-tools/agents/mini-SaaS.
Elk idee moet: een echte tijdrovende taak automatiseren, als indie-product lanseerbaar zijn,
specifiek zijn (geen vage AI-assistent maar een gerichte tool).

Marktdata:
${context.slice(0, 6000)}

JSON array met precies 3 ideeën:
[
  {
    "naam": "productnaam (max 4 woorden)",
    "tagline": "wat het doet in 6 woorden",
    "beschrijving": "2-3 zinnen: wat, hoe, voor wie",
    "doelgroep": "specifieke functie/sector",
    "pijnpunt": "concreet probleem, niet vaag",
    "type": "mini_tool|agent|website|saas",
    "prijsindicatie": "€X/maand of €X eenmalig",
    "validatiescore": 1-10,
    "markt_bewijs": "1 zin: welke data-bron dit onderbouwt",
    "onderscheidend": "wat dit anders maakt dan ChatGPT/Notion"
  }
]
Alleen JSON.`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  })
  return JSON.parse(strip((msg.content[0] as { text: string }).text))
}

// ─── Timeout helper ───────────────────────────────────────────────────────────
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  try {
    const result = await Promise.race([promise, timeout])
    clearTimeout(timer!)
    return result
  } catch {
    clearTimeout(timer!)
    return fallback
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { run_id } = await req.json()

  // Log event
  await supabaseAdmin.from('pipeline_analytics').insert({ run_id, event_type: 'run_gestart', stap: 1 })

  // Leer van eerdere campagnes
  const learnings = await haalLearnings()

  // Claude bepaalt dynamische zoektermen op basis van learnings
  const zoektermen = await bepaalZoektermen(learnings)

  // Alle bronnen parallel ophalen — Apify calls krijgen max 20s timeout
  const [reddit, producthunt, trends, linkedin] = await Promise.all([
    haalReddit(zoektermen),
    haalProductHunt(),
    withTimeout(haalGoogleTrends(zoektermen), 20000, []),
    withTimeout(haalLinkedIn(zoektermen), 20000, []),
  ])

  const allData = [...reddit, ...producthunt, ...trends, ...linkedin]
  const bronnenGebruikt = [...new Set(allData.map(d => d.bron))]

  const ideeen = await genereerIdeeen(allData, learnings, zoektermen)

  const inserts = ideeen.map((idee: Record<string, unknown>) => ({
    run_id,
    naam: idee.naam,
    tagline: idee.tagline,
    beschrijving: idee.beschrijving,
    doelgroep: idee.doelgroep,
    pijnpunt: idee.pijnpunt,
    type: idee.type,
    prijsindicatie: idee.prijsindicatie,
    validatiescore: idee.validatiescore,
    bronnen: { gebruikt: bronnenGebruikt, markt_bewijs: idee.markt_bewijs, onderscheidend: idee.onderscheidend, zoektermen },
  }))

  const { error } = await supabaseAdmin.from('product_ideas').insert(inserts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('pipeline_runs')
    .update({ status: 'wacht_op_goedkeuring', huidige_stap: 1 })
    .eq('id', run_id)

  return NextResponse.json({ ok: true, ideeen: ideeen.length, bronnen: bronnenGebruikt, zoektermen })
}

export const GET = POST
