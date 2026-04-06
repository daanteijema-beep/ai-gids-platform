import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  // Auto-fix: markeer runs als afgewezen als ze >10 min op 'running' staan.
  // Gebruikt updated_at zodat runs die net gestart zijn niet worden gedood.
  const tienMinutenGeleden = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  await supabaseAdmin
    .from('pipeline_runs')
    .update({ status: 'afgewezen', afgewezen_reden: 'Agent timeout — start opnieuw' })
    .eq('status', 'running')
    .lt('updated_at', tienMinutenGeleden)

  const { data } = await supabaseAdmin
    .from('pipeline_runs')
    .select('id, created_at, huidige_stap, status, afgewezen_reden, product_idea_id')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json(data || [])
}
