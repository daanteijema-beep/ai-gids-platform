export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Simple dashboard auth
  const auth = req.headers.get('x-dashboard-password')
  if (auth !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Mark idea as approved
  const { error } = await supabaseAdmin
    .from('pdf_ideas')
    .update({ status: 'approved' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger execution agent (awaited so client sees full result)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const execResponse = await fetch(`${baseUrl}/api/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET!,
      },
      body: JSON.stringify({ ideaId: id }),
    })

    const execResult = await execResponse.json()
    if (!execResponse.ok) {
      return NextResponse.json({ error: execResult.error || 'Execution failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, execution: execResult })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
