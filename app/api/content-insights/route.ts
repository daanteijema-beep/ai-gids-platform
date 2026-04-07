import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const [{ data: insights }, { data: niches }] = await Promise.all([
    supabaseAdmin
      .from('content_insights')
      .select('*, niches(naam, icon)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin.from('niches').select('id, naam, icon, sector_zoekterm').eq('actief', true),
  ])

  // Groepeer per week
  const perWeek: Record<string, typeof insights> = {}
  for (const item of insights || []) {
    const w = item.week || 'onbekend'
    if (!perWeek[w]) perWeek[w] = []
    perWeek[w]!.push(item)
  }

  // Unieke hooks per week
  const weekSamenvattingen = Object.entries(perWeek).map(([week, items]) => {
    const hooks = [...new Set((items || []).map(i => i.aanbevolen_hook).filter(Boolean))].slice(0, 3)
    const bronnen = [...new Set((items || []).map(i => i.bron))]
    return { week, aantal: (items || []).length, hooks, bronnen }
  }).sort((a, b) => b.week.localeCompare(a.week)).slice(0, 6)

  return NextResponse.json({ insights: insights || [], niches: niches || [], weekSamenvattingen })
}
