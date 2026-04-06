import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { supabaseAdmin } from '../supabase'

const client = new Anthropic()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function generatePersonalizedPdf(orderId: string) {
  const { data: order } = await supabaseAdmin
    .from('pdf_orders')
    .select('*, pdfs(*, pdf_templates(*))')
    .eq('id', orderId)
    .single()

  if (!order) throw new Error('Order not found')

  const pdf = order.pdfs
  const template = pdf.pdf_templates
  const inputs = order.customer_inputs as Record<string, string>
  const formFields = (pdf.form_fields as Array<{ key: string; label: string }>) || []

  // Build the input summary for the prompt
  const inputsSummary = formFields
    .map((f) => `${f.label}: ${inputs[f.key] || 'niet opgegeven'}`)
    .join('\n')

  // If we have a template, use it to structure the PDF
  const templateInstructions = template
    ? `Gebruik deze template structuur:
Tone of voice: ${template.tone_of_voice}
Hoofdstukken:
${template.chapters.map((c: any, i: number) => `${i + 1}. ${c.title}: ${c.description}`).join('\n')}
Intro: "${template.intro_template}"
Outro: "${template.outro_template}"`
    : 'Schrijf een gestructureerde gids met 5-6 hoofdstukken.'

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    messages: [{
      role: 'user',
      content: `Je schrijft een volledig gepersonaliseerde PDF gids in het Nederlands voor een kleine ondernemer.

PRODUCT: ${pdf.title}
KLANT: ${order.customer_name}
EMAIL: ${order.customer_email}

KLANT SITUATIE:
${inputsSummary}

${templateInstructions}

REGELS:
- Minimaal 2500 woorden
- Begin elke sectie met de naam van de klant of hun situatie
- Geen generieke tips — alles is specifiek voor DEZE persoon
- Gebruik de input van de klant letterlijk terug in de tekst
- Concrete, direct toepasbare acties per hoofdstuk
- Sluit elk hoofdstuk af met een "Actie voor deze week:" bullet
- Schrijf in jij-vorm, vriendelijk maar zakelijk

Formaat: gebruik ## voor hoofdstukken, ### voor subkopjes, - voor bullets.`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad PDF response')
  const pdfContent = content.text

  // Update order
  await supabaseAdmin
    .from('pdf_orders')
    .update({ generated_pdf_content: pdfContent, status: 'generated' })
    .eq('id', orderId)

  // Send personalized email
  await resend.emails.send({
    from: 'AI Gids <noreply@recruitbotai.nl>',
    to: order.customer_email,
    subject: `Jouw persoonlijke AI-gids: ${pdf.title}`,
    html: buildEmailHtml(order.customer_name, pdf.title, pdfContent),
  })

  await supabaseAdmin
    .from('pdf_orders')
    .update({ status: 'delivered', email_sent: true })
    .eq('id', orderId)

  return { success: true, orderId }
}

function buildEmailHtml(name: string, title: string, content: string): string {
  const htmlContent = content
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) return `<h2 style="color:#4f46e5;margin-top:32px;margin-bottom:8px">${line.slice(3)}</h2>`
      if (line.startsWith('### ')) return `<h3 style="color:#374151;margin-top:20px;margin-bottom:4px">${line.slice(4)}</h3>`
      if (line.startsWith('- ')) return `<li style="margin-bottom:4px">${line.slice(2)}</li>`
      if (line === '') return '<br>'
      return `<p style="margin:8px 0;line-height:1.7">${line}</p>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px;color:#1a1a1a">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:32px;border-radius:12px;margin-bottom:32px">
    <p style="margin:0 0 4px;font-size:12px;opacity:0.8;text-transform:uppercase;letter-spacing:1px">Persoonlijke AI Gids</p>
    <h1 style="margin:0 0 8px;font-size:24px">${title}</h1>
    <p style="margin:0;opacity:0.9">Speciaal samengesteld voor ${name}</p>
  </div>
  <div style="background:#f9fafb;border-left:4px solid #4f46e5;padding:16px;border-radius:4px;margin-bottom:32px">
    <p style="margin:0;font-size:14px;color:#6b7280">
      Deze gids is 100% persoonlijk geschreven op basis van jouw antwoorden.
      Bewaar hem goed — je kunt er altijd op terugkijken.
    </p>
  </div>
  ${htmlContent}
  <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:13px">
    <p>Vragen over jouw gids? Mail naar <a href="mailto:${process.env.OWNER_EMAIL}" style="color:#4f46e5">${process.env.OWNER_EMAIL}</a></p>
    <p>© AI Gids voor Ondernemers</p>
  </div>
</body>
</html>`
}
