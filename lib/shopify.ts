import { supabaseAdmin } from './supabase'

async function getShopifyConfig(): Promise<{ access_token: string; shop_domain: string } | null> {
  const { data } = await supabaseAdmin
    .from('agent_learnings')
    .select('data_points')
    .eq('insight', '__SHOPIFY_CONFIG__')
    .single()

  if (!data?.data_points) return null

  const config = data.data_points as { access_token: string; shop_domain: string; expires_at: string }

  // Check if token is expired
  if (new Date(config.expires_at) < new Date()) return null

  return { access_token: config.access_token, shop_domain: config.shop_domain }
}

export async function shopifyFetch(path: string, options: RequestInit = {}) {
  const config = await getShopifyConfig()

  // Fall back to env var token if no Supabase config
  const token = config?.access_token || process.env.SHOPIFY_ACCESS_TOKEN
  const domain = config?.shop_domain || process.env.SHOPIFY_STORE_DOMAIN

  if (!token || !domain) throw new Error('Shopify not connected')

  const res = await fetch(`https://${domain}/admin/api/2026-04${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
      ...options.headers,
    },
  })

  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`)
  return res.json()
}
