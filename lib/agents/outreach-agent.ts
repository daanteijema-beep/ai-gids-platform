import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { supabaseAdmin } from '../supabase'

const client = new Anthropic()
const resend = new Resend(process.env.RESEND_API_KEY)

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

// Follow-up leads that didn't buy after 24h
export async function runLeadFollowup() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const cutoffOld = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

  // Leads that signed up 24-72h ago and haven't bought
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('*, pdfs(title, price, slug)')
    .lt('created_at', cutoff)
    .gt('created_at', cutoffOld)

  if (!leads?.length) return { sent: 0 }

  let sent = 0
  for (const lead of leads) {
    if (!lead.pdf_id || !lead.pdfs) continue

    // Check they haven't bought
    const { count } = await supabaseAdmin
      .from('pdf_orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_email', lead.email)
      .eq('pdf_id', lead.pdf_id)
      .in('status', ['paid', 'generated', 'delivered'])

    if (count && count > 0) continue

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'
    const url = `${baseUrl}/${lead.pdfs.slug}`

    await resend.emails.send({
      from: 'AI Gids <noreply@recruitbotai.nl>',
      to: lead.email,
      subject: `Nog geen gids ontvangen? Zo werkt het`,
      html: `
<p>Hoi ${lead.name || 'daar'},</p>
<p>Je had interesse in "<strong>${lead.pdfs.title}</strong>" — maar je hebt hem nog niet.</p>
<p>Even een herinnering: voor slechts €${lead.pdfs.price} ontvang je een volledig persoonlijk stappenplan voor jouw situatie. Gegenereerd door AI op basis van jouw antwoorden.</p>
<p><strong>Wat anderen erover zeggen:</strong><br>
"Eindelijk concrete tips die ik morgen kan gebruiken — geen generiek verhaal." — Bouwvakker uit Utrecht</p>
<p><a href="${url}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
  Ja, ik wil mijn gids voor €${lead.pdfs.price} →
</a></p>
<p style="color:#999;font-size:12px">Niet meer ontvangen? <a href="#">Uitschrijven</a></p>
      `
    })
    sent++
  }

  return { sent }
}

// Announce new PDF to matching leads
export async function announceNewPdf(pdfId: string) {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience)')
    .eq('id', pdfId)
    .single()

  if (!pdf) return { sent: 0 }

  // Get leads that might be interested (no active niche filter yet — send to all)
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('email, name')
    .not('pdf_id', 'eq', pdfId) // don't spam people already interested in this one
    .limit(500)

  if (!leads?.length) return { sent: 0 }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'
  const url = `${baseUrl}/${pdf.slug}`

  let sent = 0
  for (const lead of leads) {
    await resend.emails.send({
      from: 'AI Gids <noreply@recruitbotai.nl>',
      to: lead.email,
      subject: `Nieuwe gids: ${pdf.title}`,
      html: `
<p>Hoi ${lead.name || 'daar'},</p>
<p>We hebben een nieuwe AI-gids uitgebracht die jou ook kan helpen:</p>
<h2 style="color:#1a1a1a">${pdf.title}</h2>
<p>${pdf.subtitle}</p>
<p>Slechts <strong>€${pdf.price}</strong> — volledig persoonlijk op basis van jouw situatie.</p>
<p><a href="${url}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
  Bekijk de gids →
</a></p>
<p style="color:#999;font-size:12px">Uitschrijven? <a href="#">Klik hier</a></p>
      `
    }).catch(() => {})
    sent++
  }

  return { sent }
}

// Cross-sell: customers who bought X might want Y
export async function runCrossSell() {
  // Find customers who bought something 7 days ago
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const cutoffOld = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()

  const { data: orders } = await supabaseAdmin
    .from('pdf_orders')
    .select('customer_email, customer_name, pdf_id, pdfs(title, pdf_ideas(niche))')
    .eq('status', 'delivered')
    .lt('created_at', cutoff)
    .gt('created_at', cutoffOld)

  if (!orders?.length) return { sent: 0 }

  // Find another PDF in a related niche
  const { data: otherPdfs } = await supabaseAdmin
    .from('pdfs')
    .select('id, title, price, slug')
    .eq('active', true)
    .limit(10)

  if (!otherPdfs?.length) return { sent: 0 }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'
  let sent = 0

  for (const order of orders) {
    const other = otherPdfs.find(p => p.id !== order.pdf_id)
    if (!other) continue

    await resend.emails.send({
      from: 'AI Gids <noreply@recruitbotai.nl>',
      to: order.customer_email,
      subject: `Hoe gaat het met je gids?`,
      html: `
<p>Hoi ${order.customer_name},</p>
<p>Het is een week geleden dat je jouw AI-gids hebt ontvangen. Hoe gaat het?</p>
<p>Veel ondernemers die onze gidsen gebruiken, pakken ook een tweede aan om nog meer resultaat te behalen. Misschien is dit iets voor jou:</p>
<h3>${other.title}</h3>
<p><a href="${baseUrl}/${other.slug}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
  Bekijk voor €${other.price} →
</a></p>
      `
    }).catch(() => {})
    sent++
  }

  return { sent }
}
