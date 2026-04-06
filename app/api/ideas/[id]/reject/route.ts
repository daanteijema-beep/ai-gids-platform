import { NextRequest, NextResponse } from 'next/server'
import { isDashboardOrCronAuthorizedRequest } from '@/lib/request-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isDashboardOrCronAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('pdf_ideas')
    .update({ status: 'rejected' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
