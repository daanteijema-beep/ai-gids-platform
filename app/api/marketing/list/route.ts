import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isDashboardOrCronAuthorizedRequest } from '@/lib/request-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!isDashboardOrCronAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('marketing_content')
    .select('*, niches(id, naam, icon)')
    .order('scheduled_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)
  return NextResponse.json({ content: data || [] })
}

export async function PATCH(req: NextRequest) {
  if (!isDashboardOrCronAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, scheduled_date } = await req.json()
  if (!id || !scheduled_date) return NextResponse.json({ error: 'id en scheduled_date vereist' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('marketing_content')
    .update({ scheduled_date })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
