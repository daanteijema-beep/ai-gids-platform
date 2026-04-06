import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('id, title, subtitle, description, price, slug, form_fields, images')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!pdf) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: landing } = await supabaseAdmin
    .from('landing_pages')
    .select('*')
    .eq('pdf_id', pdf.id)
    .single()

  return NextResponse.json({ pdf, landing })
}
