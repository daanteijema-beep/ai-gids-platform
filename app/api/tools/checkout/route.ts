import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const { stripePriceId, slug } = await req.json()

  if (!stripePriceId) {
    return NextResponse.json({ error: 'stripePriceId vereist' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: `${baseUrl}/tools/${slug}?success=1`,
    cancel_url: `${baseUrl}/tools/${slug}?cancelled=1`,
    metadata: { slug },
  })

  return NextResponse.json({ url: session.url })
}
