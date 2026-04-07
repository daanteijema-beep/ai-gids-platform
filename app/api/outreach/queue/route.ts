import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('outreach_queue')
    .select('*, pipeline_runs(huidige_stap), product_ideas(naam)')
    .order('created_at', { ascending: false })
    .limit(200)
  return NextResponse.json({ emails: data || [] })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'id en status vereist' }, { status: 400 })

  const update: Record<string, unknown> = { status }
  if (status === 'verstuurd') update.verstuurd_op = new Date().toISOString()

  const { error } = await supabaseAdmin.from('outreach_queue').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
