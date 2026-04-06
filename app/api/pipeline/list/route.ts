import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  // Auto-fix: markeer runs als afgewezen als ze >15 min op 'running' staan.
  // 15 min geeft Supabase edge functions (max 150s) ruim de tijd om te voltooien.
  // Gebruikt created_at als proxy — runs worden snel na aanmaken gestart.
  const vijftienMinutenGeleden = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  await supabaseAdmin
    .from('pipeline_runs')
    .update({ status: 'afgewezen', afgewezen_reden: 'Agent timeout — start opnieuw' })
    .eq('status', 'running')
    .lt('created_at', vijftienMinutenGeleden)

  const { data } = await supabaseAdmin
    .from('pipeline_runs')
    .select('id, created_at, huidige_stap, status, afgewezen_reden, product_idea_id')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json(data || [])
}
