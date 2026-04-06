import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, name, pdfId, source } = await req.json()

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('leads').upsert({
    email,
    name: name || null,
    pdf_id: pdfId || null,
    source: source || 'landing_page',
  }, { onConflict: 'email' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify owner
  await resend.emails.send({
    from: 'AI Gids <noreply@recruitbotai.nl>',
    to: process.env.OWNER_EMAIL!,
    subject: `Nieuwe lead: ${email}`,
    html: `<p>Nieuwe lead van landing page.<br>Email: ${email}<br>Naam: ${name || '-'}<br>Source: ${source || 'landing_page'}</p>`,
  }).catch(() => {/* non-critical */})

  return NextResponse.json({ success: true })
}
