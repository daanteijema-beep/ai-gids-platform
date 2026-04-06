import { Resend } from 'resend'
import { supabaseAdmin } from '../supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function generatePersonalizedPdf(orderId: string) {
  const { data: order } = await supabaseAdmin
    .from('pdf_orders')
    .select('*, pdfs(*)')
    .eq('id', orderId)
    .single()

  if (!order) throw new Error('Order not found')

  const pdf = order.pdfs
  const generatedHtml: string | null = pdf.generated_pdf_html

  if (!generatedHtml) throw new Error('PDF not yet generated for this product')

  // Replace [NAAM] placeholder with customer name
  const personalizedHtml = generatedHtml.replace(/\[NAAM\]/g, order.customer_name)

  // Save to order record
  await supabaseAdmin
    .from('pdf_orders')
    .update({ generated_pdf_content: personalizedHtml, status: 'generated' })
    .eq('id', orderId)

  // Send email
  await resend.emails.send({
    from: 'AI Gids <noreply@recruitbotai.nl>',
    to: order.customer_email,
    subject: `Jouw AI-gids: ${pdf.title}`,
    html: buildEmailWrapper(order.customer_name, pdf.title, personalizedHtml),
  })

  await supabaseAdmin
    .from('pdf_orders')
    .update({ status: 'delivered', email_sent: true })
    .eq('id', orderId)

  return { success: true, orderId }
}

function buildEmailWrapper(name: string, title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px 0; }
  .wrapper { max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  p { line-height: 1.75; color: #374151; margin: 0 0 12px; }
  ul, ol { padding-left: 20px; margin: 8px 0 16px; }
  li { line-height: 1.7; color: #374151; margin-bottom: 6px; }
  strong { color: #1f2937; }
  h1, h2, h3 { line-height: 1.3; }
  .footer { padding: 24px 48px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
  .footer p { font-size: 13px; color: #9ca3af; margin: 4px 0; }
  .footer a { color: #4f46e5; }
  .email-intro { padding: 32px 48px 0; }
  .email-intro p { font-size: 15px; color: #374151; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="email-intro">
    <p>Hoi ${name},</p>
    <p>Jouw AI-gids <strong>"${title}"</strong> staat hieronder klaar. Succes!</p>
  </div>
  ${bodyHtml}
  <div class="footer">
    <p>Vragen? Mail <a href="mailto:${process.env.OWNER_EMAIL}">${process.env.OWNER_EMAIL}</a></p>
    <p>© AI Gids voor Ondernemers</p>
  </div>
</div>
</body>
</html>`
}
