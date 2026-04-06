import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../supabase'
import { stripe } from '../stripe'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

type PdfPerformance = {
  id: string
  title: string
  niche: string
  price: number
  slug: string
  days_live: number
  total_sales: number
  revenue: number
  conversion_rate: number
  social_posts_planned: number
  social_posts_published: number
}

export async function runOrchestratorAgent() {
  // 1. Collect all performance data
  const { data: pdfs } = await supabaseAdmin
    .from('pdfs')
    .select('id, title, price, slug, created_at, pdf_ideas(niche)')
    .eq('active', true)

  if (!pdfs?.length) return { message: 'No active PDFs yet' }

  const performance: PdfPerformance[] = []

  for (const pdf of pdfs) {
    const daysLive = Math.floor(
      (Date.now() - new Date(pdf.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    const [{ count: totalSales }, { count: socialPlanned }, { count: socialPublished }] =
      await Promise.all([
        supabaseAdmin
          .from('pdf_orders')
          .select('*', { count: 'exact', head: true })
          .eq('pdf_id', pdf.id)
          .eq('status', 'delivered'),
        supabaseAdmin
          .from('social_posts')
          .select('*', { count: 'exact', head: true })
          .eq('pdf_id', pdf.id),
        supabaseAdmin
          .from('social_posts')
          .select('*', { count: 'exact', head: true })
          .eq('pdf_id', pdf.id)
          .eq('status', 'published'),
      ])

    performance.push({
      id: pdf.id,
      title: pdf.title,
      niche: (pdf.pdf_ideas as any)?.niche || 'unknown',
      price: pdf.price,
      slug: pdf.slug,
      days_live: daysLive,
      total_sales: totalSales || 0,
      revenue: (totalSales || 0) * pdf.price,
      conversion_rate: daysLive > 0 ? ((totalSales || 0) / daysLive) * 100 : 0,
      social_posts_planned: socialPlanned || 0,
      social_posts_published: socialPublished || 0,
    })
  }

  // 2. Load recent learnings
  const { data: recentLearnings } = await supabaseAdmin
    .from('agent_learnings')
    .select('learning_type, insight')
    .order('created_at', { ascending: false })
    .limit(30)

  // 3. Ask Claude to analyze and generate structured learnings
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Je bent de orchestrator van een geautomatiseerd PDF verkoopsysteem voor Nederlandse ondernemers.

Analyseer deze performance data en genereer concrete learnings + instructies voor alle agents.

HUIDIGE PERFORMANCE:
${JSON.stringify(performance, null, 2)}

BESTAANDE LEARNINGS:
${recentLearnings?.map(l => `[${l.learning_type}] ${l.insight}`).join('\n') || 'Geen'}

Genereer een analyse met:
1. Welke niches presteren het best (per verkoop/dag)
2. Welke prijspunten werken
3. Aanbevelingen voor de research agent (focus hierop)
4. Aanbevelingen voor de content agent (welke platforms/types werken)
5. Aanbevelingen voor de outreach agent (timing, segmentatie)
6. PDFs die gestopt moeten worden (< 0 sales na 14 dagen)

Antwoord ALLEEN in dit JSON formaat:
{
  "summary": "1-zin samenvatting van de staat van het systeem",
  "top_performing_niches": ["niche1", "niche2"],
  "underperforming_pdf_ids": ["id1"],
  "learnings": [
    {
      "type": "research_focus",
      "insight": "concrete instructie voor research agent",
      "priority": "high"
    },
    {
      "type": "content_strategy",
      "insight": "concrete instructie voor content agent",
      "priority": "medium"
    },
    {
      "type": "outreach_strategy",
      "insight": "concrete instructie voor outreach agent",
      "priority": "high"
    },
    {
      "type": "price_sensitivity",
      "insight": "wat werkt qua prijs",
      "priority": "medium"
    },
    {
      "type": "niche_performance",
      "insight": "welke niches scoren",
      "priority": "high"
    }
  ]
}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad orchestrator response')
  const analysis = JSON.parse(stripJson(content.text))

  // 4. Save learnings to database
  for (const learning of analysis.learnings) {
    await supabaseAdmin.from('agent_learnings').insert({
      learning_type: learning.type,
      insight: learning.insight,
      data_points: { priority: learning.priority, source: 'orchestrator' },
    })
  }

  // 5. Save analytics snapshot for all PDFs
  for (const p of performance) {
    await supabaseAdmin.from('pdf_analytics').insert({
      pdf_id: p.id,
      stripe_total_sales: p.total_sales,
      stripe_revenue: p.revenue,
      landing_page_views: 0,
      landing_page_conversion_rate: p.conversion_rate,
      social_total_reach: 0,
      social_total_engagement: 0,
    })
  }

  // 6. Optionally deactivate underperforming PDFs
  if (analysis.underperforming_pdf_ids?.length) {
    await supabaseAdmin
      .from('pdfs')
      .update({ active: false })
      .in('id', analysis.underperforming_pdf_ids)
  }

  return {
    summary: analysis.summary,
    learningsAdded: analysis.learnings.length,
    pdfsAnalyzed: performance.length,
    underperformingDeactivated: analysis.underperforming_pdf_ids?.length || 0,
    topNiches: analysis.top_performing_niches,
  }
}
