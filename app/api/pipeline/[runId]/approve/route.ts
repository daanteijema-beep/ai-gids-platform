import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseFunctionUrl } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase'

const ORCHESTRATOR_URL = getSupabaseFunctionUrl('orchestrator')

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

    // Maak automatisch een pdf_idea aan zodat het idee verkoopbaar wordt
    const { data: idee } = await supabaseAdmin
      .from('product_ideas')
      .select('naam, tagline, beschrijving, doelgroep, pijnpunt, type, prijsindicatie, validatiescore')
      .eq('id', product_idea_id)
      .single()

    if (idee) {
      const priceMatch = (idee.prijsindicatie || '').match(/€\s*(\d+)/)
      const price = priceMatch ? parseFloat(priceMatch[1]) : 29
      await supabaseAdmin.from('pdf_ideas').insert({
        product_idea_id,
        title: idee.naam,
        subtitle: idee.tagline,
        target_audience: idee.doelgroep,
        problem_solved: idee.pijnpunt,
        estimated_price: price,
        research_rationale: idee.beschrijving,
        agent_confidence_score: idee.validatiescore,
        product_type: idee.type,
        status: 'pending',
        niche: idee.doelgroep,
      })
    }

    // Verhoog huidige_stap zodat dashboard "Marketing agent bezig" toont, niet "Research"
    await supabaseAdmin.from('pipeline_runs').update({ product_idea_id, status: 'running', huidige_stap: 2 }).eq('id', runId)
    await supabaseAdmin.from('pipeline_analytics').insert({
      run_id: runId, product_idea_id, event_type: 'idee_geselecteerd', stap: 1,
    })
  } else if (stap < 6) {
    // Verhoog huidige_stap direct zodat het dashboard de juiste agent toont
    await supabaseAdmin.from('pipeline_runs').update({ status: 'running', huidige_stap: stap + 1 }).eq('id', runId)
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

  // Trigger de orchestrator — die bepaalt welke agent als volgende draait.
  // Fire-and-forget: niet wachten op response, Vercel zou timeouten.
  const secret = process.env.CRON_SECRET || ''
  fetch(ORCHESTRATOR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ run_id: runId }),
  }).catch(err => console.error('Orchestrator trigger fout:', err))

  return NextResponse.json({ ok: true, stap_goedgekeurd: stap })
}
