import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const { data } = await supabaseAdmin
    .from('pipeline_leads')
    .select('id, bedrijfsnaam, sector, plaats, kwaliteit_score, notitie, website')
    .eq('run_id', runId)
    .order('kwaliteit_score', { ascending: false })
  return NextResponse.json(data || [])
}
