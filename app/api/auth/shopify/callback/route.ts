import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // Validate state cookie
  const cookieState = req.cookies.get('shopify_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=shopify_invalid_state`)
  }

  if (!code || !shop) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=shopify_missing_params`)
  }

  try {
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    })

    const data = await res.json() as { access_token?: string; error?: string }

    if (!data.access_token) {
      return NextResponse.redirect(`${appUrl}/dashboard/settings?error=shopify_token_failed`)
    }

    // Save to Supabase
    await supabaseAdmin.from('agent_learnings').upsert({
      learning_type: 'general',
      insight: '__SHOPIFY_CONFIG__',
      data_points: {
        access_token: data.access_token,
        shop_domain: shop,
        connected_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    })

    const response = NextResponse.redirect(`${appUrl}/dashboard/settings?shopify_connected=1`)
    response.cookies.delete('shopify_oauth_state')
    return response

  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=shopify_error`)
  }
}
