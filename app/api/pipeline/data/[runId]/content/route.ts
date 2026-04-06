import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const { data } = await supabaseAdmin
    .from('content_posts')
    .select('id, platform, afbeelding_url, afbeelding_alt, tekst, hashtags')
    .eq('run_id', runId)
  return NextResponse.json(data || [])
}
