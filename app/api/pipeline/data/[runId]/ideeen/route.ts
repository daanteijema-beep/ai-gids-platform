import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const { data } = await supabaseAdmin
    .from('product_ideas')
    .select('*')
    .eq('run_id', runId)
    .order('validatiescore', { ascending: false })
  return NextResponse.json(data || [])
}
