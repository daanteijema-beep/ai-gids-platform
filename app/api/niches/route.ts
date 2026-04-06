import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('niches')
    .select('*')
    .eq('actief', true)
    .order('naam')
  return NextResponse.json({ niches: data || [] })
}
