import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: idea, error } = await supabaseAdmin
    .from('pdf_ideas')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !idea) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch related pdf if published
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('id, slug, stripe_price_id')
    .eq('idea_id', id)
    .maybeSingle()

  return NextResponse.json({ idea, pdf: pdf || null })
}
