import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('pipeline_runs')
    .select('id, created_at, huidige_stap, status, afgewezen_reden, product_idea_id')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json(data || [])
}
