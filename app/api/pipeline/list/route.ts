import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  // Auto-fix: markeer runs als afgewezen als ze >5 min op 'running' staan
  // (Vercel Hobby limiet is 60s, dus na 5 min is de agent zeker niet meer bezig)
  const vijfMinutenGeleden = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  await supabaseAdmin
    .from('pipeline_runs')
    .update({ status: 'afgewezen', afgewezen_reden: 'Agent timeout — start opnieuw' })
    .eq('status', 'running')
    .lt('created_at', vijfMinutenGeleden)

  const { data } = await supabaseAdmin
    .from('pipeline_runs')
    .select('id, created_at, huidige_stap, status, afgewezen_reden, product_idea_id')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json(data || [])
}
