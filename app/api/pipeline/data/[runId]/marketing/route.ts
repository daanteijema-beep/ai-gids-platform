import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const { data } = await supabaseAdmin.from('marketing_plans').select('*').eq('run_id', runId).single()
  return NextResponse.json(data || null)
}
