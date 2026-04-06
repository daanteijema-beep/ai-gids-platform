export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function isAuthorized(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret') || ''
  const auth = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  return secret === process.env.CRON_SECRET || auth === process.env.CRON_SECRET || auth === 'dev'
}

function getWeek(): string {
  const now = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

// ─── Apify helper ─────────────────────────────────────────────────────────────

async function apifyRun(actorId: string, input: Record<string, unknown>, maxWaitMs = 90000): Promise<unknown[]> {
  const token = process.env.APIFY_TOKEN
  if (!token) return []
  try {
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}&memory=256`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
    )
    if (!startRes.ok) return []
    const run = await startRes.json()
    const runId = run?.data?.id
    if (!runId) return []

    const polls = Math.ceil(maxWaitMs / 10000)
    for (let i = 0; i < polls; i++) {
      await new Promise(r => setTimeout(r, 10000))
      const pd = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`).then(r => r.json())
      if (pd?.data?.status === 'SUCCEEDED') {
        const items = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=20`).then(r => r.json())
        return Array.isArray(items) ? items : []
      }
      if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(pd?.data?.status)) return []
    }
    return []
  } catch { return [] }
}

// ─── Google Trends per niche ───────────────────────────────────────────────────

async function haalGoogleTrends(zoekterm: string): Promise<{ titel: string; samenvatting: string; ruwe_data: unknown }[]> {
  const items = await apifyRun('apify/google-trends-scraper', {
    searchTerms: [`${zoekterm} Twente`, `${zoekterm} Overijssel`, zoekterm],
    geo: 'NL',
    timeRange: 'now 7-d',
  })
  if (!items.length) return []
  return [{
    titel: `Google Trends: ${zoekterm}`,
    samenvatting: `Zoektrend data voor "${zoekterm}" in NL afgelopen 7 dagen`,
    ruwe_data: items.slice(0, 5),
  }]
}

// ─── LinkedIn via Google Search ────────────────────────────────────────────────

async function haalLinkedInPosts(zoekterm: string): Promise<{ titel: string; samenvatting: string; ruwe_data: unknown }[]> {
  const items = await apifyRun('apify/google-search-scraper', {
    queries: `site:linkedin.com/posts "${zoekterm}" OR "vakbedrijf" Nederland`,
    resultsPerPage: 10,
    maxPagesPerQuery: 1,
    languageCode: 'nl',
    countryCode: 'nl',
  })
  if (!items.length) return []
  return (items as Array<{ title?: string; snippet?: string; url?: string }>).slice(0, 5).map(r => ({
    titel: r.title || 'LinkedIn post',
    samenvatting: r.snippet || '',
    ruwe_data: r,
  }))
}

// ─── Reddit via public API ─────────────────────────────────────────────────────

async function haalRedditPosts(zoekterm: string): Promise<{ titel: string; samenvatting: string; ruwe_data: unknown }[]> {
  try {
    const subreddits = ['ondernemers', 'Netherlands', 'thenetherlands']
    const results: { titel: string; samenvatting: string; ruwe_data: unknown }[] = []
    for (const sub of subreddits) {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(zoekterm)}&sort=top&t=month&limit=5`,
        { headers: { 'User-Agent': 'VakwebTwente/1.0' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      const posts = data?.data?.children || []
      for (const post of posts.slice(0, 3)) {
        const p = post.data
        results.push({
          titel: p.title,
          samenvatting: p.selftext?.slice(0, 200) || p.title,
          ruwe_data: { url: `https://reddit.com${p.permalink}`, score: p.score, comments: p.num_comments },
        })
      }
    }
    return results
  } catch { return [] }
}

// ─── Concurrent websites via Firecrawl ────────────────────────────────────────

async function haalConcurrentieData(): Promise<{ titel: string; samenvatting: string; ruwe_data: unknown }[]> {
  const concurrenten = [
    'https://www.yoast.com/nl',
    'https://www.websitemakers.nl',
    'https://www.mijndomein.nl/website-maken',
  ]
  const results: { titel: string; samenvatting: string; ruwe_data: unknown }[] = []
  for (const url of concurrenten) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
        body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
      })
      if (!res.ok) continue
      const data = await res.json()
      const tekst = (data?.data?.markdown || '').slice(0, 800)
      if (tekst) results.push({ titel: `Concurrent: ${new URL(url).hostname}`, samenvatting: tekst, ruwe_data: { url } })
    } catch { continue }
  }
  return results
}

// ─── Claude analyseert alle data ──────────────────────────────────────────────

async function analyseer(niche: string, allData: { bron: string; titel: string; samenvatting: string }[]) {
  const prompt = `Je bent marketing strateeg voor VakwebTwente — een dienst die websites + AI-agents verkoopt aan Twentse vakbedrijven (${niche}) voor €79-149/maand.

Analyseer deze trend- en marktdata en geef voor ELKE bron een aanbevolen content hook:

${allData.map(d => `[${d.bron.toUpperCase()}] ${d.titel}\n${d.samenvatting}`).join('\n\n---\n\n')}

Geef JSON:
{
  "top_inzicht": "belangrijkste bevinding voor content deze week",
  "aanbevolen_hook": "concrete openingszin die werkt op LinkedIn/email voor ${niche}",
  "content_themas": ["thema1", "thema2", "thema3"],
  "urgentie": "wat speelt er nu bij ${niche} in Twente dat relevant is"
}`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })
  try {
    const text = (msg.content[0] as { text: string }).text
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim())
  } catch { return null }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const week = getWeek()
  const { data: niches } = await supabaseAdmin.from('niches').select('id, naam, sector_zoekterm').eq('actief', true)
  if (!niches?.length) return NextResponse.json({ error: 'Geen niches' }, { status: 400 })

  // Verwerk max 3 niches per run om binnen maxDuration te blijven
  const batch = niches.slice(0, 3)
  const resultaten: Array<{ niche: string; inzichten: number }> = []

  // Concurrenten 1x per week ophalen (niet per niche)
  const concurrentData = await haalConcurrentieData()

  for (const niche of batch) {
    const zoekterm = niche.sector_zoekterm

    // Haal data parallel op
    const [trends, linkedin, reddit] = await Promise.all([
      haalGoogleTrends(zoekterm),
      haalLinkedInPosts(zoekterm),
      haalRedditPosts(zoekterm),
    ])

    const allData = [
      ...trends.map(d => ({ bron: 'google_trends' as const, ...d })),
      ...linkedin.map(d => ({ bron: 'linkedin' as const, ...d })),
      ...reddit.map(d => ({ bron: 'reddit' as const, ...d })),
      ...concurrentData.map(d => ({ bron: 'concurrent' as const, ...d })),
    ]

    // Claude analyse
    const analyse = await analyseer(niche.naam, allData)

    // Sla op in Supabase
    const inserts = allData.map(d => ({
      niche_id: niche.id,
      bron: d.bron,
      zoekterm,
      titel: d.titel,
      samenvatting: d.samenvatting,
      ruwe_data: d.ruwe_data as Record<string, unknown>,
      relevantie_score: 7,
      aanbevolen_hook: analyse?.aanbevolen_hook || null,
      week,
    }))

    if (inserts.length) {
      await supabaseAdmin.from('content_insights').insert(inserts)
    }

    // Sla ook analyse op als marketing_content
    if (analyse) {
      await supabaseAdmin.from('marketing_content').insert({
        niche_id: niche.id,
        type: 'landing_page_copy',
        titel: `Trend analyse week ${week}`,
        content: analyse,
        status: 'draft',
      })
    }

    resultaten.push({ niche: niche.naam, inzichten: inserts.length })
  }

  return NextResponse.json({ week, resultaten, bronnen: ['google_trends', 'linkedin', 'reddit', 'concurrent'] })
}

export const POST = GET
