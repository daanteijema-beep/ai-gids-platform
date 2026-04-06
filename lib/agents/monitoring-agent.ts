import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../supabase'
import { stripe } from '../stripe'

const client = new Anthropic()

export async function runMonitoringAgent() {
  // Fetch all active PDFs
  const { data: pdfs } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_orders(count)')
    .eq('active', true)

  if (!pdfs?.length) return { message: 'Geen actieve PDFs' }

  const analyticsData: Record<string, unknown>[] = []

  for (const pdf of pdfs) {
    // Get Stripe revenue for this product
    const charges = await stripe.charges.list({
      limit: 100,
    })

    const productRevenue = charges.data
      .filter(c => c.metadata?.pdf_id === pdf.id && c.paid)
      .reduce((sum, c) => sum + c.amount, 0) / 100

    const productSales = charges.data.filter(
      c => c.metadata?.pdf_id === pdf.id && c.paid
    ).length

    // Get order count from DB
    const { count: orderCount } = await supabaseAdmin
      .from('pdf_orders')
      .select('*', { count: 'exact', head: true })
      .eq('pdf_id', pdf.id)
      .eq('status', 'delivered')

    // Save analytics snapshot
    await supabaseAdmin.from('pdf_analytics').insert({
      pdf_id: pdf.id,
      stripe_total_sales: productSales,
      stripe_revenue: productRevenue,
      landing_page_views: 0, // Would need analytics integration
      landing_page_conversion_rate: productSales > 0 ? (productSales / 100) * 100 : 0,
      social_total_reach: 0,
      social_total_engagement: 0,
    })

    analyticsData.push({
      title: pdf.title,
      niche: pdf.slug,
      price: pdf.price,
      sales: productSales,
      revenue: productRevenue,
      orders_in_db: orderCount,
    })
  }

  // Ask Claude to extract learnings
  const learningsResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Je bent een marketing analyst. Analyseer deze PDF verkoopdata en extraheer 3-5 concrete learnings.

Data:
${JSON.stringify(analyticsData, null, 2)}

Antwoord ALLEEN in dit JSON formaat:
{
  "learnings": [
    {
      "learning_type": "niche_performance",
      "insight": "concrete beschrijving van wat je hebt geleerd",
      "data_points": {"relevant": "data"}
    }
  ]
}

Learning types: niche_performance, price_sensitivity, platform_roi, general`,
      },
    ],
  })

  const learningsContent = learningsResponse.content[0]
  if (learningsContent.type !== 'text') throw new Error('Bad learnings response')
  const learningsData = JSON.parse(learningsContent.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim())

  for (const learning of learningsData.learnings) {
    await supabaseAdmin.from('agent_learnings').insert({
      learning_type: learning.learning_type,
      insight: learning.insight,
      data_points: learning.data_points,
    })
  }

  return { pdfsAnalyzed: pdfs.length, learningsExtracted: learningsData.learnings.length }
}
