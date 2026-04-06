import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop') || process.env.SHOPIFY_STORE_URL!

  if (!code) {
    return NextResponse.json({ error: 'No code received' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/shopify/callback`,
      }),
    })

    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch {
      return new NextResponse(`
        <html><body style="font-family:sans-serif;padding:40px;max-width:600px">
          <h2>❌ Shopify gaf geen JSON terug</h2>
          <p>Status: ${res.status}</p>
          <pre style="background:#fee2e2;padding:12px;border-radius:8px;font-size:12px;overflow:auto">${text.substring(0, 500)}</pre>
          <p>Waarschijnlijk verkeerde client_secret. <a href="/api/auth/shopify">Probeer opnieuw</a></p>
        </body></html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    if (!data.access_token) {
      return new NextResponse(`
        <html><body style="font-family:sans-serif;padding:40px;max-width:600px">
          <h2>❌ Token exchange mislukt</h2>
          <pre style="background:#fee2e2;padding:12px;border-radius:8px">${JSON.stringify(data, null, 2)}</pre>
          <p>Probeer opnieuw: <a href="/api/auth/shopify">Koppel Shopify</a></p>
        </body></html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    // Save token to Vercel env automatically
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px;max-width:600px">
        <h2>✅ Shopify gekoppeld!</h2>
        <p>Jouw access token:</p>
        <code style="background:#f3f4f6;padding:12px;display:block;border-radius:8px;word-break:break-all;font-size:13px">
          SHOPIFY_ACCESS_TOKEN=${data.access_token}
        </code>
        <p style="margin-top:16px">Zet dit in je <strong>.env.local</strong> en als Vercel environment variable.</p>
        <p style="color:#6b7280;font-size:13px">Shop: ${shop}</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } })

  } catch (err) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:40px">
        <h2>❌ Fout</h2>
        <pre>${String(err)}</pre>
        <a href="/api/auth/shopify">Probeer opnieuw</a>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } })
  }
}
