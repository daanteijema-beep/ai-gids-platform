import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  void req // niet gebruikt maar nodig voor Next.js route signature

  const { data: run, error } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({ status: 'running', huidige_stap: 1 })
    .select()
    .single()

  if (error || !run) return NextResponse.json({ error: 'Kon run niet aanmaken' }, { status: 500 })

  // Geeft next_agent terug — dashboard triggert de agent zelf via /api/agents/run
  return NextResponse.json({ ok: true, run_id: run.id, next_agent: 'research-ideas' })
}
