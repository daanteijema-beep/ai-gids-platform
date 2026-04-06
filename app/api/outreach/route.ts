import { NextRequest, NextResponse } from 'next/server'
import { runLeadFollowup, runCrossSell } from '@/lib/agents/outreach-agent'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const [followup, crosssell] = await Promise.all([runLeadFollowup(), runCrossSell()])
    return NextResponse.json({ success: true, followup, crosssell })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
