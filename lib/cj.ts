/**
 * CJ Dropshipping API client
 * Docs: https://developers.cjdropshipping.com/
 */

let cachedToken: { token: string; expires: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token
  }

  const res = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.CJ_EMAIL,
      apiKey: process.env.CJ_API_KEY,
    }),
  })

  const data = await res.json()
  if (!data.result || !data.data?.accessToken) {
    throw new Error(`CJ auth failed: ${data.message}`)
  }

  // Cache for 14 days (token valid 15 days)
  cachedToken = {
    token: data.data.accessToken,
    expires: Date.now() + 14 * 24 * 60 * 60 * 1000,
  }

  return cachedToken.token
}

export interface CJProduct {
  pid: string
  productName: string
  productSku: string
  productImage: string
  sellPrice: number
  categoryName: string
  description?: string
  variants?: CJVariant[]
}

export interface CJVariant {
  vid: string
  variantName: string
  variantSku: string
  variantPrice: number
  variantImage: string
  variantStock: number
}

export async function searchProducts(params: {
  keyword?: string
  categoryId?: string
  pageNum?: number
  pageSize?: number
}): Promise<{ products: CJProduct[]; total: number }> {
  const token = await getAccessToken()

  const query = new URLSearchParams({
    pageNum: String(params.pageNum || 1),
    pageSize: String(params.pageSize || 20),
    ...(params.keyword && { productNameEn: params.keyword }),
    ...(params.categoryId && { categoryId: params.categoryId }),
  })

  const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/list?${query}`, {
    headers: { 'CJ-Access-Token': token },
  })

  const data = await res.json()
  if (!data.result) throw new Error(`CJ product search failed: ${data.message}`)

  return {
    products: (data.data?.list || []).map((p: any) => ({
      pid: p.pid,
      productName: p.productNameEn,
      productSku: p.productSku,
      productImage: p.productImage,
      sellPrice: parseFloat(p.sellPrice || '0'),
      categoryName: p.categoryName,
    })),
    total: data.data?.total || 0,
  }
}

export async function getProductDetail(pid: string): Promise<CJProduct> {
  const token = await getAccessToken()

  const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${pid}`, {
    headers: { 'CJ-Access-Token': token },
  })

  const data = await res.json()
  if (!data.result) throw new Error(`CJ product detail failed: ${data.message}`)

  const p = data.data
  return {
    pid: p.pid,
    productName: p.productNameEn,
    productSku: p.productSku,
    productImage: p.productImage,
    sellPrice: parseFloat(p.sellPrice || '0'),
    categoryName: p.categoryName,
    description: p.description,
    variants: (p.variants || []).map((v: any) => ({
      vid: v.vid,
      variantName: v.variantNameEn,
      variantSku: v.variantSku,
      variantPrice: parseFloat(v.variantSellPrice || '0'),
      variantImage: v.variantImage,
      variantStock: v.variantStock || 0,
    })),
  }
}

export async function getCategories(): Promise<{ id: string; name: string }[]> {
  const token = await getAccessToken()

  const res = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/getCategory', {
    headers: { 'CJ-Access-Token': token },
  })

  const data = await res.json()
  if (!data.result) throw new Error(`CJ categories failed: ${data.message}`)

  return (data.data || []).map((c: any) => ({
    id: c.categoryId,
    name: c.categoryName,
  }))
}
