import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { naam, bedrijf, telefoon, email, sector, bericht, niche_id, bron } = body

  if (!naam || !telefoon) {
    return NextResponse.json({ error: 'Naam en telefoon zijn verplicht' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('leads').insert({
    naam, bedrijf, telefoon, email, sector, bericht,
    niche_id: niche_id || null,
    bron: bron || 'contactformulier',
    status: 'nieuw',
  })

  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
  }

  await resend.emails.send({
    from: 'VakwebTwente <noreply@vakwebtwente.nl>',
    to: process.env.OWNER_EMAIL || 'daanteijema@gmail.com',
    subject: `🔔 Nieuwe aanvraag: ${naam} — ${bedrijf || sector || 'vakbedrijf'}`,
    html: `
      <h2 style="color:#f97316">Nieuwe aanvraag via VakwebTwente</h2>
      <table style="font-size:14px">
        <tr><td style="color:#666;padding:4px 12px 4px 0">Naam:</td><td><strong>${naam}</strong></td></tr>
        <tr><td style="color:#666;padding:4px 12px 4px 0">Bedrijf:</td><td>${bedrijf || '—'}</td></tr>
        <tr><td style="color:#666;padding:4px 12px 4px 0">Telefoon:</td><td><a href="tel:${telefoon}">${telefoon}</a></td></tr>
        <tr><td style="color:#666;padding:4px 12px 4px 0">Email:</td><td>${email || '—'}</td></tr>
        <tr><td style="color:#666;padding:4px 12px 4px 0">Sector:</td><td>${sector || '—'}</td></tr>
        <tr><td style="color:#666;padding:4px 12px 4px 0">Bericht:</td><td>${bericht || '—'}</td></tr>
      </table>
      <br>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'}/dashboard/leads"
         style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
        Bekijk in dashboard →
      </a>
    `,
  }).catch(console.error)

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('*, niches(naam, icon)')
    .order('created_at', { ascending: false })
    .limit(500)
  return NextResponse.json({ leads: data || [] })
}
