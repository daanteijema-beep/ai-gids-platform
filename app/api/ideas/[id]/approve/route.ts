export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runWebsiteSubagent } from '@/lib/agents/subagents/website-subagent'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Run website subagent only (Stripe product + landing page)
  // All other steps are triggered separately via /api/agents/step/[step]
  try {
    const { pdfId, slug } = await runWebsiteSubagent(id)

    await supabaseAdmin
      .from('pdf_ideas')
      .update({ status: 'approved' })
      .eq('id', id)

    return NextResponse.json({ success: true, pdfId, slug })
  } catch (err) {
    console.error('Approve error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
