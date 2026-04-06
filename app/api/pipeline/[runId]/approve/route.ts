import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Stap → volgende agent endpoint
const VOLGENDE_AGENT: Record<number, string> = {
  1: '/api/agents/marketing-plan',
  2: '/api/agents/landing-page-agent',
  3: '/api/agents/content-creator',
  4: '/api/agents/lead-gen-pipeline',
  5: '/api/agents/outreach-writer',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params
  const body = await req.json().catch(() => ({}))
  const host = req.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const base = `${protocol}://${host}`
  const secret = process.env.CRON_SECRET || ''

  // Haal huidige run op
  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (!run) return NextResponse.json({ error: 'Run niet gevonden' }, { status: 404 })
  if (run.status !== 'wacht_op_goedkeuring') {
    return NextResponse.json({ error: `Run heeft status '${run.status}', niet wacht_op_goedkeuring` }, { status: 400 })
  }

  const stap = run.huidige_stap as number

  // Stap 1: gebruiker kiest welk idee → zet product_idea_id op run
  if (stap === 1) {
    const { product_idea_id } = body
    if (!product_idea_id) return NextResponse.json({ error: 'product_idea_id vereist bij stap 1' }, { status: 400 })

    await supabaseAdmin
      .from('product_ideas')
      .update({ geselecteerd: true })
      .eq('id', product_idea_id)

    await supabaseAdmin
      .from('pipeline_runs')
      .update({ product_idea_id, status: 'running' })
      .eq('id', runId)

    // Log analytics
    await supabaseAdmin.from('pipeline_analytics').insert({
      run_id: runId, product_idea_id, event_type: 'idee_geselecteerd', stap: 1,
    })
  } else if (stap < 6) {
    // Stap 2-5: goedkeuren en volgende stap starten
    await supabaseAdmin
      .from('pipeline_runs')
      .update({ status: 'running' })
      .eq('id', runId)

    await supabaseAdmin.from('pipeline_analytics').insert({
      run_id: runId, product_idea_id: run.product_idea_id, event_type: 'stap_goedgekeurd', stap,
    })
  } else {
    // Stap 6: finale goedkeuring → pipeline voltooid + learning opslaan
    await supabaseAdmin
      .from('pipeline_runs')
      .update({ status: 'voltooid' })
      .eq('id', runId)

    await supabaseAdmin.from('pipeline_analytics').insert({
      run_id: runId, product_idea_id: run.product_idea_id, event_type: 'stap_goedgekeurd', stap: 6,
    })

    // Sla campaign learning op zodat de research agent hiervan leert
    if (run.product_idea_id) {
      const { data: idee } = await supabaseAdmin
        .from('product_ideas').select('type, doelgroep').eq('id', run.product_idea_id).single()
      const { data: mplan } = await supabaseAdmin
        .from('marketing_plans').select('icp, social_plan').eq('run_id', runId).single()
      const { count: aantalLeads } = await supabaseAdmin
        .from('pipeline_leads').select('*', { count: 'exact', head: true }).eq('run_id', runId)
      const { count: aantalEmails } = await supabaseAdmin
        .from('outreach_queue').select('*', { count: 'exact', head: true }).eq('run_id', runId)

      const icp = (mplan?.icp as Record<string, string>) || {}
      const socialPlan = (mplan?.social_plan as Record<string, Record<string, string>>) || {}
      const besteKanaal = socialPlan?.linkedin ? 'linkedin' : 'email'

      if (idee) {
        await supabaseAdmin.from('campaign_learnings').insert({
          run_id: runId,
          product_type: idee.type,
          doelgroep: idee.doelgroep,
          beste_kanaal: besteKanaal,
          wat_werkte: `Volledige pipeline doorlopen voor ${idee.doelgroep} via ${besteKanaal}`,
          totaal_leads: aantalLeads || 0,
          totaal_reacties: 0,
          notities: { locatie: icp.locatie, tech_niveau: icp.tech_niveau, emails_klaargezet: aantalEmails },
        })
      }
    }

    return NextResponse.json({ ok: true, status: 'voltooid' })
  }

  // Trigger volgende agent (fire-and-forget via after())
  const volgendAgent = VOLGENDE_AGENT[stap]
  if (volgendAgent) {
    after(async () => {
      try {
        await fetch(`${base}${volgendAgent}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
          body: JSON.stringify({ run_id: runId }),
        })
      } catch (e) {
        console.error(`Agent stap ${stap + 1} fout:`, e)
        await supabaseAdmin
          .from('pipeline_runs')
          .update({ status: 'afgewezen', afgewezen_reden: `Agent stap ${stap + 1} mislukt` })
          .eq('id', runId)
      }
    })
  }

  return NextResponse.json({ ok: true, stap_goedgekeurd: stap, volgende_stap: stap + 1 })
}
