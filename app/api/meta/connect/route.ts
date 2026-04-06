import { NextRequest, NextResponse } from 'next/server'

// Redirects to Meta OAuth — user logs in with Facebook and grants permissions
export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: [
      'pages_manage_posts',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
    ].join(','),
    response_type: 'code',
    state: process.env.CRON_SECRET!, // CSRF protection
  })

  return NextResponse.redirect(
    `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`
  )
}
