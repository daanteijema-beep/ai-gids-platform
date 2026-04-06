import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const host = req.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const base = `${protocol}://${host}`
  const secret = process.env.CRON_SECRET || ''

  // Maak pipeline run aan
  const { data: run, error } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({ status: 'running', huidige_stap: 1 })
    .select()
    .single()

  if (error || !run) return NextResponse.json({ error: 'Kon run niet aanmaken' }, { status: 500 })

  // Trigger Agent 1 na de response (after = fire-and-forget na response)
  after(async () => {
    try {
      await fetch(`${base}/api/agents/research-ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ run_id: run.id }),
      })
    } catch (e) {
      console.error('Research agent start fout:', e)
      await supabaseAdmin
        .from('pipeline_runs')
        .update({ status: 'afgewezen', afgewezen_reden: 'Agent 1 start mislukt' })
        .eq('id', run.id)
    }
  })

  return NextResponse.json({ ok: true, run_id: run.id })
}
