// Supabase Edge Function: orchestrator
// De 7e agent — stuurt de hele pipeline aan.
// Wordt getriggerd door de approve route na elke goedkeuring.
// Bepaalt welke agent als volgende draait en roept die aan.
// Fire-and-forget vanuit Vercel → orchestrator wacht op de agent → DB update.

import { createClient } from 'npm:@supabase/supabase-js'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const BASE = 'https://knagzemkqtjuenlmkeff.supabase.co/functions/v1'

const AGENT_PER_STAP: Record<number, string> = {
  1: `${BASE}/research-ideas`,
  2: `${BASE}/marketing-plan`,
  3: `${BASE}/landing-page-agent`,
  4: `${BASE}/content-creator`,
  5: `${BASE}/lead-gen-pipeline`,
  6: `${BASE}/outreach-writer`,
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  if (auth !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { run_id } = await req.json()
  if (!run_id) return new Response(JSON.stringify({ error: 'run_id vereist' }), { status: 400 })

  // Haal huidige stap op
  const { data: run } = await supabase
    .from('pipeline_runs')
    .select('huidige_stap, status')
    .eq('id', run_id)
    .single()

  if (!run) return new Response(JSON.stringify({ error: 'Run niet gevonden' }), { status: 404 })
  if (run.status !== 'running') {
    return new Response(JSON.stringify({ skip: true, reden: `status is ${run.status}, niet running` }), { status: 200 })
  }

  const stap = run.huidige_stap as number
  const agentUrl = AGENT_PER_STAP[stap]

  if (!agentUrl) {
    // Stap 7+ = pipeline voltooid
    await supabase.from('pipeline_runs').update({ status: 'voltooid' }).eq('id', run_id)
    return new Response(JSON.stringify({ ok: true, voltooid: true }), { status: 200 })
  }

  console.log(`Orchestrator: start stap ${stap} → ${agentUrl} voor run ${run_id}`)

  // Roep de agent aan en wacht op het resultaat (orchestrator heeft 150s)
  try {
    const res = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('CRON_SECRET')}`,
      },
      body: JSON.stringify({ run_id }),
    })

    const text = await res.text()
    let result: unknown
    try { result = JSON.parse(text) } catch { result = { raw: text.slice(0, 200) } }

    console.log(`Orchestrator: stap ${stap} klaar, status ${res.status}:`, JSON.stringify(result)?.slice(0, 200))
    return new Response(JSON.stringify({ ok: res.ok, stap, result }), { status: 200 })

  } catch (e) {
    const reden = e instanceof Error ? e.message : String(e)
    console.error(`Orchestrator: stap ${stap} crash:`, reden)
    await supabase.from('pipeline_runs')
      .update({ status: 'afgewezen', afgewezen_reden: `Orchestrator crash stap ${stap}: ${reden}` })
      .eq('id', run_id)
    return new Response(JSON.stringify({ error: reden }), { status: 500 })
  }
})
