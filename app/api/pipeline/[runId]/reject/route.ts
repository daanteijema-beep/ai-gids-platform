import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params
  const { reden } = await req.json().catch(() => ({ reden: '' }))

  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .select('huidige_stap, product_idea_id')
    .eq('id', runId)
    .single()

  if (!run) return NextResponse.json({ error: 'Run niet gevonden' }, { status: 404 })

  await supabaseAdmin
    .from('pipeline_runs')
    .update({ status: 'afgewezen', afgewezen_reden: reden || 'Afgewezen door gebruiker' })
    .eq('id', runId)

  // Log analytics — zodat het systeem leert waarom stappen worden afgewezen
  await supabaseAdmin.from('pipeline_analytics').insert({
    run_id: runId,
    product_idea_id: run.product_idea_id,
    event_type: 'stap_afgewezen',
    stap: run.huidige_stap,
    metadata: { reden: reden || 'geen reden opgegeven' },
  })

  // Sla learning op: toekomstige research agent houdt rekening met wat niet werkte
  if (run.product_idea_id) {
    const { data: idee } = await supabaseAdmin
      .from('product_ideas')
      .select('type, doelgroep')
      .eq('id', run.product_idea_id)
      .single()

    if (idee) {
      await supabaseAdmin.from('campaign_learnings').insert({
        run_id: runId,
        product_type: idee.type,
        doelgroep: idee.doelgroep,
        wat_niet_werkte: `Afgewezen stap ${run.huidige_stap}: ${reden || 'geen reden'}`,
        notities: { afgewezen_stap: run.huidige_stap, reden },
      })
    }
  }

  return NextResponse.json({ ok: true, status: 'afgewezen' })
}
