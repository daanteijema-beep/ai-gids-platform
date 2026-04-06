import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const { data } = await supabaseAdmin
    .from('outreach_queue')
    .select('id, aan_bedrijf, aan_email, onderwerp, mail_body, status')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })
  return NextResponse.json(data || [])
}
