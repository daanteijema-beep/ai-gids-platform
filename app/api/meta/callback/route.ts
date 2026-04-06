import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// After Meta OAuth, exchange code for long-lived token + find Instagram account
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=meta_denied`
    )
  }

  if (state !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`

  // Step 1: Exchange code for short-lived user token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code: code! })
  )
  const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } }

  if (!tokenData.access_token) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=token_failed`
    )
  }

  // Step 2: Exchange for long-lived user token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: tokenData.access_token,
    })
  )
  const longData = await longRes.json() as { access_token?: string }
  const longToken = longData.access_token || tokenData.access_token

  // Step 3: Get Pages + Instagram accounts
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${longToken}&fields=id,name,instagram_business_account`
  )
  const pagesData = await pagesRes.json() as { data?: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string } }> }

  const pages = pagesData.data || []
  const pageWithIg = pages.find(p => p.instagram_business_account)

  // Step 4: Store tokens in agent_learnings (as config) and env-like storage
  const config = {
    meta_page_token: pageWithIg?.access_token || longToken,
    meta_ig_account_id: pageWithIg?.instagram_business_account?.id || null,
    meta_page_id: pageWithIg?.id || null,
    meta_page_name: pageWithIg?.name || null,
    connected_at: new Date().toISOString(),
  }

  // Store in Supabase as a config record
  await supabaseAdmin.from('agent_learnings').upsert({
    learning_type: 'general',
    insight: '__META_CONFIG__',
    data_points: config,
  })

  const igFound = !!config.meta_ig_account_id
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?meta_connected=1&ig=${igFound ? '1' : '0'}`
  )
}
