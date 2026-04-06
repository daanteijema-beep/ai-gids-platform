import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const { pdfId, customerName, customerEmail, customerInputs } = await req.json()

  if (!pdfId || !customerEmail || !customerName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: pdf, error } = await supabaseAdmin
    .from('pdfs')
    .select('*')
    .eq('id', pdfId)
    .eq('active', true)
    .single()

  if (error || !pdf) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
  }

  // Create order record
  const { data: order, error: orderError } = await supabaseAdmin
    .from('pdf_orders')
    .insert({
      pdf_id: pdfId,
      customer_email: customerEmail,
      customer_name: customerName,
      customer_inputs: customerInputs,
      status: 'pending_payment',
      email_sent: false,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const checkoutUrl = await createCheckoutSession(
    pdf.stripe_price_id,
    pdfId,
    { ...customerInputs, order_id: order.id, customer_name: customerName, customer_email: customerEmail },
    `${baseUrl}/checkout/success?order=${order.id}`,
    `${baseUrl}/${pdf.slug}?cancelled=1`
  )

  return NextResponse.json({ url: checkoutUrl })
}
