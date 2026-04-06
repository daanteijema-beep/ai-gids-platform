import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://knagzemkqtjuenlmkeff.supabase.co/functions/v1'

// Agents die via Supabase Edge Functions draaien (geen 60s Vercel limiet)
const SUPABASE_AGENTS: Record<string, string> = {
  'research-ideas':    `${SUPABASE_URL}/research-ideas`,
  'marketing-plan':    `${SUPABASE_URL}/marketing-plan`,
  'lead-gen-pipeline': `${SUPABASE_URL}/lead-gen-pipeline`,
  'outreach-writer':   `${SUPABASE_URL}/outreach-writer`,
}

const AGENTS: Record<string, { path: string; method: string }> = {
  // Standalone agents
  'trend-scout':        { path: '/api/agents/trend-scout',  method: 'GET' },
  'outreach':           { path: '/api/outreach',            method: 'POST' },
  'marketing-research': { path: '/api/marketing/research',  method: 'POST' },
  // Pipeline agents (triggered na approve) — zware agents via Supabase
  'landing-page-agent':   { path: '/api/agents/landing-page-agent',   method: 'POST' },
  'content-creator':      { path: '/api/agents/content-creator',      method: 'POST' },
  'outreach-writer':      { path: '/api/agents/outreach-writer',       method: 'POST' },
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { agentId, niche_id, run_id } = body

  const secret = process.env.CRON_SECRET || ''
  const payload: Record<string, string> = {}
  if (niche_id) payload.niche_id = niche_id
  if (run_id) payload.run_id = run_id

  // Supabase agents: fire-and-forget — NIET wachten op response.
  // Vercel Hobby zou timeouten (60s) als we wachten op een 2-minuten Supabase job.
  // De Supabase function update pipeline_runs direct als die klaar is.
  if (SUPABASE_AGENTS[agentId]) {
    fetch(SUPABASE_AGENTS[agentId], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify(payload),
    }).catch(err => console.error(`Supabase agent ${agentId} fout:`, err))

    return NextResponse.json({ ok: true, queued: true, agent: agentId })
  }

  const agent = AGENTS[agentId]
  if (!agent) return NextResponse.json({ error: 'Onbekende agent' }, { status: 400 })

  const host = req.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const url = `${protocol}://${host}${agent.path}`

  const res = await fetch(url, {
    method: agent.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: agent.method === 'POST' ? JSON.stringify(payload) : undefined,
  })

  // Vercel kan HTML teruggeven bij timeouts/crashes — vang dat op
  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    console.error(`Agent ${agentId} gaf geen JSON terug (status ${res.status}):`, text.slice(0, 200))
    return NextResponse.json({ error: `Agent ${agentId} gaf geen geldige response`, raw: text.slice(0, 200) }, { status: 502 })
  }
  return NextResponse.json(data, { status: res.status })
}
