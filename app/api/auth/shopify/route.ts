import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.SHOPIFY_CLIENT_ID!
  const store = process.env.SHOPIFY_STORE_URL!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/shopify/callback`
  const scopes = 'read_products,write_products,read_orders,read_inventory,write_inventory'
  const state = Math.random().toString(36).substring(2)

  const authUrl = `https://${store}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  return Response.redirect(authUrl)
}
