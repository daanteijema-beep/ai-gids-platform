import { NextRequest, NextResponse } from 'next/server'
import { runMonitoringAgent } from '@/lib/agents/monitoring-agent'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runMonitoringAgent()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Monitor agent error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
