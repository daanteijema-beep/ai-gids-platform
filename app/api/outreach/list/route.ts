import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('outreach_targets')
    .select('*, niches(naam, icon)')
    .order('created_at', { ascending: false })
    .limit(500)
  return NextResponse.json({ targets: data || [] })
}
