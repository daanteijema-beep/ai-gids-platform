import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop') || process.env.SHOPIFY_STORE_URL!

  if (!code) {
    return NextResponse.json({ error: 'No code received' }, { status: 400 })
  }

  // Exchange code for access token
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  })

  const data = await res.json()

  if (!data.access_token) {
    return NextResponse.json({ error: 'Token exchange failed', data }, { status: 400 })
  }

  // Show the token so the user can copy it to .env.local
  return new NextResponse(`
    <html><body style="font-family:sans-serif;padding:40px;max-width:600px">
      <h2>✅ Shopify gekoppeld!</h2>
      <p>Kopieer dit token naar je <code>.env.local</code>:</p>
      <code style="background:#f3f4f6;padding:12px;display:block;border-radius:8px;word-break:break-all">
        SHOPIFY_ACCESS_TOKEN=${data.access_token}
      </code>
      <p style="margin-top:20px;color:#6b7280">Daarna kun je dit venster sluiten.</p>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html' } })
}
