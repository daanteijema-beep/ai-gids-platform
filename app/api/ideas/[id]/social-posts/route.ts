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

  if (!pdf) return NextResponse.json({ posts: [] })

  const { data: posts } = await supabaseAdmin
    .from('social_posts')
    .select('*')
    .eq('pdf_id', pdf.id)
    .order('scheduled_date', { ascending: true })

  return NextResponse.json({ posts: posts || [] })
}
