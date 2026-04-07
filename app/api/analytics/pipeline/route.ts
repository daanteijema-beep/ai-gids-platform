import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const [
    { count: totalRuns },
    { count: runningRuns },
    { count: completedRuns },
    { count: totalIdeas },
    { count: selectedIdeas },
    { count: totalLeads },
    { count: emailsKlaar },
    { count: emailsVerstuurd },
    { data: recentRuns },
    { data: learnings },
    { data: topSectors },
  ] = await Promise.all([
    supabaseAdmin.from('pipeline_runs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('pipeline_runs').select('*', { count: 'exact', head: true }).eq('status', 'running'),
    supabaseAdmin.from('pipeline_runs').select('*', { count: 'exact', head: true }).eq('status', 'voltooid'),
    supabaseAdmin.from('product_ideas').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('product_ideas').select('*', { count: 'exact', head: true }).eq('geselecteerd', true),
    supabaseAdmin.from('pipeline_leads').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('outreach_queue').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('outreach_queue').select('*', { count: 'exact', head: true }).eq('status', 'verstuurd'),
    supabaseAdmin.from('pipeline_runs')
      .select('id, status, huidige_stap, created_at, updated_at, product_ideas(naam)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin.from('campaign_learnings')
      .select('doelgroep, beste_kanaal, totaal_leads, totaal_reacties, wat_werkte')
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin.from('pipeline_leads')
      .select('sector')
      .not('sector', 'is', null)
      .limit(500),
  ])

  // Top sectoren tellen
  const sectorCount: Record<string, number> = {}
  for (const l of topSectors || []) {
    if (l.sector) sectorCount[l.sector] = (sectorCount[l.sector] || 0) + 1
  }
  const topSectorList = Object.entries(sectorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([sector, count]) => ({ sector, count }))

  return NextResponse.json({
    funnel: {
      runs: totalRuns || 0,
      running: runningRuns || 0,
      completed: completedRuns || 0,
      ideas: totalIdeas || 0,
      selectedIdeas: selectedIdeas || 0,
      leads: totalLeads || 0,
      emailsKlaar: emailsKlaar || 0,
      emailsVerstuurd: emailsVerstuurd || 0,
    },
    recentRuns: recentRuns || [],
    learnings: learnings || [],
    topSectors: topSectorList,
  })
}
