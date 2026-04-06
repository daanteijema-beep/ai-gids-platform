import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const notitie = body.notitie || null

  const { data: run, error } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({ status: 'running', huidige_stap: 1, notitie })
    .select()
    .single()

  if (error || !run) return NextResponse.json({ error: 'Kon run niet aanmaken' }, { status: 500 })

  // Geeft next_agent terug — dashboard triggert de agent zelf via /api/agents/run
  return NextResponse.json({ ok: true, run_id: run.id, next_agent: 'research-ideas' })
}
