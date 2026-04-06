import { NextRequest, NextResponse } from 'next/server'

const AGENTS: Record<string, { path: string; method: string }> = {
  'trend-scout':        { path: '/api/agents/trend-scout', method: 'GET' },
  'outreach':           { path: '/api/outreach',           method: 'POST' },
  'marketing-research': { path: '/api/marketing/research', method: 'POST' },
}

export async function POST(req: NextRequest) {
  const { agentId, niche_id } = await req.json()

  const agent = AGENTS[agentId]
  if (!agent) return NextResponse.json({ error: 'Onbekende agent' }, { status: 400 })

  const host = req.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const url = `${protocol}://${host}${agent.path}?secret=${encodeURIComponent(process.env.CRON_SECRET || '')}`

  const res = await fetch(url, {
    method: agent.method,
    headers: { 'Content-Type': 'application/json' },
    body: agent.method === 'POST' ? JSON.stringify(niche_id ? { niche_id } : {}) : undefined,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
