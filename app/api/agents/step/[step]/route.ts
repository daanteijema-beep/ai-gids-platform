/**
 * Per-step agent endpoint — elk draait zelfstandig binnen 60s
 * POST /api/agents/step/pdf      { pdfId }
 * POST /api/agents/step/social   { pdfId }
 * POST /api/agents/step/images   { pdfId }
 * POST /api/agents/step/mail     { pdfId }
 * POST /api/agents/step/leads    { pdfId }
 */
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { runPdfSubagent } from '@/lib/agents/subagents/pdf-subagent'
import { runSocialSubagent } from '@/lib/agents/subagents/social-subagent'
import { runImageSubagent } from '@/lib/agents/subagents/image-subagent'
import { runMailSubagent } from '@/lib/agents/subagents/mail-subagent'
import { runLeadFinderForPdf } from '@/lib/agents/lead-finder-agent'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ step: string }> }
) {
  const { step } = await params
  const { pdfId } = await req.json()

  if (!pdfId) {
    return NextResponse.json({ error: 'pdfId required' }, { status: 400 })
  }

  try {
    switch (step) {
      case 'pdf': {
        const result = await runPdfSubagent(pdfId)
        return NextResponse.json({ success: true, step, ...result })
      }
      case 'social': {
        const result = await runSocialSubagent(pdfId)
        return NextResponse.json({ success: true, step, ...result })
      }
      case 'images': {
        const result = await runImageSubagent(pdfId)
        return NextResponse.json({ success: true, step, ...result })
      }
      case 'mail': {
        const result = await runMailSubagent(pdfId)
        return NextResponse.json({ success: true, step, ...result })
      }
      case 'leads': {
        const result = await runLeadFinderForPdf(pdfId)
        return NextResponse.json({ success: true, step, ...result })
      }
      default:
        return NextResponse.json({ error: `Unknown step: ${step}` }, { status: 400 })
    }
  } catch (err) {
    console.error(`Step ${step} failed for pdfId ${pdfId}:`, err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
