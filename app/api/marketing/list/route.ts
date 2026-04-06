import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('marketing_content')
    .select('*, niches(id, naam, icon)')
    .order('created_at', { ascending: false })
    .limit(200)
  return NextResponse.json({ content: data || [] })
}
