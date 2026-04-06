import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const VOLGENDE_AGENT: Record<number, string> = {
  1: 'marketing-plan',
  2: 'landing-page-agent',
  3: 'content-creator',
  4: 'lead-gen-pipeline',
  5: 'outreach-writer',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params
  const body = await req.json().catch(() => ({}))

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

  if (stap === 1) {
    const { product_idea_id } = body
    if (!product_idea_id) return NextResponse.json({ error: 'product_idea_id vereist bij stap 1' }, { status: 400 })

    await supabaseAdmin.from('product_ideas').update({ geselecteerd: true }).eq('id', product_idea_id)
    await supabaseAdmin.from('pipeline_runs').update({ product_idea_id, status: 'running' }).eq('id', runId)
    await supabaseAdmin.from('pipeline_analytics').insert({
      run_id: runId, product_idea_id, event_type: 'idee_geselecteerd', stap: 1,
    })
  } else if (stap < 6) {
    await supabaseAdmin.from('pipeline_runs').update({ status: 'running' }).eq('id', runId)
    await supabaseAdmin.from('pipeline_analytics').insert({
      run_id: runId, product_idea_id: run.product_idea_id, event_type: 'stap_goedgekeurd', stap,
    })
  } else {
    // Stap 6: finale goedkeuring → pipeline voltooid
    await supabaseAdmin.from('pipeline_runs').update({ status: 'voltooid' }).eq('id', runId)
    await supabaseAdmin.from('pipeline_analytics').insert({
      run_id: runId, product_idea_id: run.product_idea_id, event_type: 'stap_goedgekeurd', stap: 6,
    })

    if (run.product_idea_id) {
      const { data: idee } = await supabaseAdmin.from('product_ideas').select('type, doelgroep').eq('id', run.product_idea_id).single()
      const { data: mplan } = await supabaseAdmin.from('marketing_plans').select('icp, social_plan').eq('run_id', runId).single()
      const { count: aantalLeads } = await supabaseAdmin.from('pipeline_leads').select('*', { count: 'exact', head: true }).eq('run_id', runId)
      const { count: aantalEmails } = await supabaseAdmin.from('outreach_queue').select('*', { count: 'exact', head: true }).eq('run_id', runId)

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

    return NextResponse.json({ ok: true, status: 'voltooid', next_agent: null })
  }

  // Geef next_agent terug — dashboard triggert de agent zelf via /api/agents/run
  const next_agent = VOLGENDE_AGENT[stap] || null
  return NextResponse.json({ ok: true, stap_goedgekeurd: stap, next_agent })
}
