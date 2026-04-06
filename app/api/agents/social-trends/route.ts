export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { runSocialTrendsAgent } from '@/lib/agents/social-trends-agent'
import { isDashboardOrCronAuthorizedRequest } from '@/lib/request-auth'

async function handler(req: NextRequest) {
  if (!isDashboardOrCronAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runSocialTrendsAgent()
    return NextResponse.json({ success: true, trendsFound: result.trends.length, summary: result.summary })
  } catch (error) {
    console.error('Social trends agent error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export const GET = handler
export const POST = handler
