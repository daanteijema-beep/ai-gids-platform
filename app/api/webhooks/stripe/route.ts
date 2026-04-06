import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { generatePersonalizedPdf } from '@/lib/agents/pdf-generator'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const rawInputs = (session.metadata?.customer_inputs) || '{}'
    let parsed: Record<string, string> = {}
    try { parsed = JSON.parse(rawInputs) } catch { /* ignore */ }
    const orderId = parsed.order_id || session.metadata?.order_id

    if (!orderId) {
      console.error('No order_id in session metadata')
      return NextResponse.json({ received: true })
    }

    await supabaseAdmin
      .from('pdf_orders')
      .update({ status: 'paid', stripe_session_id: session.id })
      .eq('id', orderId)

    generatePersonalizedPdf(orderId).catch(err => {
      console.error('PDF generation error for order', orderId, err)
    })
  }

  return NextResponse.json({ received: true })
}
