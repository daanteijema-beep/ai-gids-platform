import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('marketing_content')
    .select('*, niches(id, naam, icon)')
    .order('scheduled_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)
  return NextResponse.json({ content: data || [] })
}

export async function PATCH(req: NextRequest) {
  const { id, scheduled_date } = await req.json()
  if (!id || !scheduled_date) return NextResponse.json({ error: 'id en scheduled_date vereist' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('marketing_content')
    .update({ scheduled_date })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
