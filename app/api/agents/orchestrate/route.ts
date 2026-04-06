export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { runOrchestratorAgent } from '@/lib/agents/orchestrator-agent'
import { isDashboardOrCronAuthorizedRequest } from '@/lib/request-auth'

async function handler(req: NextRequest) {
  if (!isDashboardOrCronAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runOrchestratorAgent()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Orchestrator error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export const GET = handler
export const POST = handler
