import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Resolve idea → pdf id
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('id')
    .eq('idea_id', id)
    .maybeSingle()

  if (!pdf) return NextResponse.json({ sequences: [] })

  // Email sequences stored in agent_learnings with pdf_id in data_points
  const { data: learnings } = await supabaseAdmin
    .from('agent_learnings')
    .select('data_points')
    .eq('learning_type', 'outreach_strategy')
    .filter('data_points->>pdf_id', 'eq', pdf.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const sequences = learnings?.[0]?.data_points?.sequences || []
  return NextResponse.json({ sequences })
}
