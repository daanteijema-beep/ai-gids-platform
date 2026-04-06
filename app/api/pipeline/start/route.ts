import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseFunctionUrl } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase'

const ORCHESTRATOR_URL = getSupabaseFunctionUrl('orchestrator')

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const notitie = body.notitie || null

  const { data: run, error } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({ status: 'running', huidige_stap: 1, notitie })
    .select()
    .single()

  if (error || !run) return NextResponse.json({ error: 'Kon run niet aanmaken' }, { status: 500 })

  // Trigger orchestrator — die start stap 1 (research-ideas) fire-and-forget
  const secret = process.env.CRON_SECRET || ''
  fetch(ORCHESTRATOR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ run_id: run.id }),
  }).catch(err => console.error('Orchestrator start fout:', err))

  return NextResponse.json({ ok: true, run_id: run.id })
}
