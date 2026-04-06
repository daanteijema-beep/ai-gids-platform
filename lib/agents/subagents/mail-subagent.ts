/**
 * Mail Subagent
 * Verantwoordelijk voor: lead nurture emails klaarzetten + aankondiging nieuwe PDF
 */
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { supabaseAdmin } from '../../supabase'

const client = new Anthropic()
const resend = new Resend(process.env.RESEND_API_KEY)

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

type EmailSequence = {
  subject: string
  preview_text: string
  body_html: string
  delay_hours: number
  trigger: 'signup' | 'no_purchase_24h' | 'no_purchase_72h' | 'post_purchase_7d'
}

export async function runMailSubagent(pdfId: string): Promise<{ emailsGenerated: number; announced: number }> {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience)')
    .eq('id', pdfId)
    .single()

  if (!pdf) throw new Error('PDF not found')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'
  const pdfUrl = `${baseUrl}/${pdf.slug}`

  // 1. Generate email sequence for this PDF
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Schrijf een email nurture sequence voor dit PDF product voor Nederlandse kleine ondernemers.

Product: ${pdf.title}
Doelgroep: ${(pdf.pdf_ideas as any)?.target_audience}
Prijs: €${pdf.price}
URL: ${pdfUrl}

Maak 4 emails:
1. Direct na aanmelding (trigger: signup) — welkom, verwachting wekken
2. Na 24u zonder aankoop (trigger: no_purchase_24h) — social proof + FAQ
3. Na 72u zonder aankoop (trigger: no_purchase_72h) — urgentie/schaarste
4. Na aankoop na 7 dagen (trigger: post_purchase_7d) — check-in + cross-sell hint

Schrijf in vriendelijk, direct Nederlands. Geen spam-taal.

Antwoord ALLEEN in dit JSON formaat:
{
  "emails": [
    {
      "trigger": "signup",
      "delay_hours": 0,
      "subject": "onderwerpregel...",
      "preview_text": "preview tekst...",
      "body_html": "<p>volledige email HTML body...</p>"
    }
  ]
}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad email response')
  const emailData = JSON.parse(stripJson(content.text))

  // Store email sequences in agent_learnings for reference
  await supabaseAdmin.from('agent_learnings').insert({
    learning_type: 'outreach_strategy',
    insight: `[EMAIL SEQUENCE] PDF: ${pdf.title} — ${emailData.emails.length} emails gegenereerd voor ${pdf.slug}`,
    data_points: {
      pdf_id: pdfId,
      sequences: emailData.emails.map((e: EmailSequence) => ({
        trigger: e.trigger,
        subject: e.subject,
        delay_hours: e.delay_hours,
      })),
      source: 'mail_subagent',
    },
  })

  // 2. Announce to existing leads
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('email, name')
    .not('pdf_id', 'eq', pdfId)
    .limit(500)

  let announced = 0
  if (leads?.length) {
    for (const lead of leads) {
      await resend.emails.send({
        from: 'AI Gids <noreply@recruitbotai.nl>',
        to: lead.email,
        subject: `Nieuw: ${pdf.title}`,
        html: `
<p>Hoi ${lead.name || 'daar'},</p>
<p>We hebben een nieuwe persoonlijke AI-gids klaar:</p>
<h2 style="color:#4f46e5">${pdf.title}</h2>
<p>${pdf.subtitle || pdf.description}</p>
<p>Voor slechts <strong>€${pdf.price}</strong> — volledig op maat voor jouw situatie.</p>
<p><a href="${pdfUrl}" style="background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:8px">
  Bekijk de gids →
</a></p>
<p style="color:#9ca3af;font-size:12px;margin-top:24px">
  Je ontvangt dit omdat je eerder interesse toonde in onze gidsen.<br>
  <a href="#" style="color:#9ca3af">Uitschrijven</a>
</p>`,
      }).catch(() => {})
      announced++
    }
  }

  return { emailsGenerated: emailData.emails.length, announced }
}
