export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { runResearchAgent } from '@/lib/agents/research-agent'
import { isDashboardOrCronAuthorizedRequest } from '@/lib/request-auth'

async function handler(req: NextRequest) {
  if (!isDashboardOrCronAuthorizedRequest(req)) {
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

export const GET = handler
export const POST = handler
