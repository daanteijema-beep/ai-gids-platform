import { NextRequest, NextResponse } from 'next/server'
import { runExecutionAgent } from '@/lib/agents/execution-agent'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ideaId } = await req.json()
  if (!ideaId) return NextResponse.json({ error: 'ideaId required' }, { status: 400 })

  try {
    const result = await runExecutionAgent(ideaId)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Execution agent error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
