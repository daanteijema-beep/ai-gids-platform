import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { supabaseAdmin } from '../supabase'

const client = new Anthropic()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function generatePersonalizedPdf(orderId: string) {
  const { data: order, error } = await supabaseAdmin
    .from('pdf_orders')
    .select('*, pdfs(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error('Order not found')

  const pdf = order.pdfs
  const inputs = order.customer_inputs as Record<string, string>

  // Format inputs for the prompt
  const formFields = (pdf.form_fields as Array<{ key: string; label: string }>) || []
  const inputsSummary = formFields
    .map((f) => `${f.label}: ${inputs[f.key] || 'niet ingevuld'}`)
    .join('\n')

  // Generate personalized PDF content with Claude
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    messages: [
      {
        role: 'user',
        content: `Je schrijft een gepersonaliseerde PDF gids in het Nederlands voor een kleine ondernemer.

Product: ${pdf.title}
Klant: ${order.customer_name}

Situatie van de klant:
${inputsSummary}

Schrijf een volledige, gepersonaliseerde gids van minimaal 2500 woorden. Gebruik ALLEEN de situatie van DEZE klant om concrete, specifieke adviezen te geven. Geen generieke tips — alles moet direct toepasbaar zijn op hun situatie.

Structuur:
1. Persoonlijke analyse (jouw situatie is...)
2. Concrete stap-voor-stap AI strategie (5-7 stappen)
3. Tools en prompts die direct werken voor jouw sector
4. Week 1 actieplan (wat doe je deze week?)
5. Maand 1 resultaten (wat kun je verwachten?)

Schrijf in een toegankelijke, directe stijl. Begin elke sectie met de naam van de klant.

Formaat: gewone tekst met duidelijke kopjes (gebruik ## voor hoofdstukken, ### voor subkopjes).`,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad PDF response')

  const pdfContent = content.text

  // Update order with generated content
  await supabaseAdmin
    .from('pdf_orders')
    .update({
      generated_pdf_content: pdfContent,
      status: 'generated',
    })
    .eq('id', orderId)

  // Send email with PDF content
  await resend.emails.send({
    from: 'AI Gids <noreply@recruitbotai.nl>',
    to: order.customer_email,
    subject: `Jouw persoonlijke gids: ${pdf.title}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; color: #1a1a1a; }
    h1 { color: #1a1a1a; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
    h2 { color: #6366f1; margin-top: 30px; }
    h3 { color: #374151; }
    p { line-height: 1.7; }
    .header { background: #6366f1; color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { color: white; border-bottom: none; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${pdf.title}</h1>
    <p>Persoonlijk voor ${order.customer_name}</p>
  </div>
  ${pdfContent
    .split('\n')
    .map((line: string) => {
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`
      if (line.trim() === '') return '<br>'
      return `<p>${line}</p>`
    })
    .join('\n')}
  <div class="footer">
    <p>Dit is jouw persoonlijke AI gids — gegenereerd op basis van jouw specifieke situatie.</p>
    <p>Vragen? Mail naar ${process.env.OWNER_EMAIL}</p>
  </div>
</body>
</html>`,
  })

  // Mark as delivered
  await supabaseAdmin
    .from('pdf_orders')
    .update({ status: 'delivered', email_sent: true })
    .eq('id', orderId)

  return { success: true, orderId }
}
