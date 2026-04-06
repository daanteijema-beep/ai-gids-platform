import { NextRequest, NextResponse } from 'next/server'
import { runResearchAgent } from '@/lib/agents/research-agent'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runResearchAgent()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Research agent error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
