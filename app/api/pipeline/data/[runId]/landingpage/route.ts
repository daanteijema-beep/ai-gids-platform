import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const { data } = await supabaseAdmin
    .from('landing_pages')
    .select('slug, hero_headline, hero_subline, cta_tekst, stripe_product_id, prijs_in_cents, live')
    .eq('run_id', runId)
    .single()
  return NextResponse.json(data || null)
}
