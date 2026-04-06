import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
})

export async function createStripeProduct(
  title: string,
  description: string,
  price: number
): Promise<{ productId: string; priceId: string }> {
  const product = await stripe.products.create({
    name: title,
    description,
    metadata: { type: 'ai_pdf' },
  })

  const stripePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(price * 100), // cents
    currency: 'eur',
  })

  return { productId: product.id, priceId: stripePrice.id }
}

export async function createCheckoutSession(
  priceId: string,
  pdfId: string,
  customerInputs: Record<string, string>,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      pdf_id: pdfId,
      customer_inputs: JSON.stringify(customerInputs),
    },
    payment_intent_data: {
      metadata: {
        pdf_id: pdfId,
      },
    },
  })

  return session.url!
}
