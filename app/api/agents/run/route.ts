import { NextRequest, NextResponse } from 'next/server'

const AGENTS: Record<string, { path: string; method: string }> = {
  // Standalone agents
  'trend-scout':        { path: '/api/agents/trend-scout',  method: 'GET' },
  'outreach':           { path: '/api/outreach',            method: 'POST' },
  'marketing-research': { path: '/api/marketing/research',  method: 'POST' },
  // Pipeline agents (triggered na approve)
  'research-ideas':       { path: '/api/agents/research-ideas',       method: 'POST' },
  'marketing-plan':       { path: '/api/agents/marketing-plan',       method: 'POST' },
  'landing-page-agent':   { path: '/api/agents/landing-page-agent',   method: 'POST' },
  'content-creator':      { path: '/api/agents/content-creator',      method: 'POST' },
  'lead-gen-pipeline':    { path: '/api/agents/lead-gen-pipeline',     method: 'POST' },
  'outreach-writer':      { path: '/api/agents/outreach-writer',       method: 'POST' },
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { agentId, niche_id, run_id } = body

  const agent = AGENTS[agentId]
  if (!agent) return NextResponse.json({ error: 'Onbekende agent' }, { status: 400 })

  const host = req.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const secret = process.env.CRON_SECRET || ''
  const url = `${protocol}://${host}${agent.path}`

  const payload: Record<string, string> = {}
  if (niche_id) payload.niche_id = niche_id
  if (run_id) payload.run_id = run_id

  const res = await fetch(url, {
    method: agent.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: agent.method === 'POST' ? JSON.stringify(payload) : undefined,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
