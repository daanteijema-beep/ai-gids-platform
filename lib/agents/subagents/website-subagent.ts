/**
 * Website Subagent
 * Verantwoordelijk voor: Stripe product, landing page content, PDF personalisatie + verzending
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../../supabase'
import { createStripeProduct } from '../../stripe'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

export async function runWebsiteSubagent(ideaId: string): Promise<{ pdfId: string; slug: string }> {
  const { data: idea } = await supabaseAdmin
    .from('pdf_ideas')
    .select('*')
    .eq('id', ideaId)
    .single()

  if (!idea) throw new Error('Idea not found')

  // 1. Create Stripe product
  const { productId, priceId } = await createStripeProduct(
    idea.title,
    idea.subtitle || idea.problem_solved,
    idea.estimated_price
  )

  // 2. Generate slug
  const slug = idea.title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60)

  // 3. Insert PDF record
  const { data: pdf, error: pdfError } = await supabaseAdmin
    .from('pdfs')
    .insert({
      idea_id: ideaId,
      title: idea.title,
      subtitle: idea.subtitle,
      description: idea.problem_solved,
      price: idea.estimated_price,
      stripe_product_id: productId,
      stripe_price_id: priceId,
      slug,
      form_fields: idea.form_fields,
      active: true,
    })
    .select('id')
    .single()

  if (pdfError || !pdf) throw new Error('Failed to create PDF: ' + pdfError?.message)

  // 4. Generate landing page content with Claude
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Schrijf overtuigende Nederlandse landingspagina content voor dit PDF product.

Title: ${idea.title}
Doelgroep: ${idea.target_audience}
Probleem: ${idea.problem_solved}
Prijs: €${idea.estimated_price}
Niche: ${idea.niche}

De pagina moet de bezoeker overtuigen om hun gegevens in te vullen en te betalen.
Wees concreet, gebruik cijfers en specifieke voordelen.

Antwoord ALLEEN in dit JSON formaat:
{
  "hero_headline": "pakkende kop die direct het probleem adresseert",
  "hero_subtext": "2 zinnen die de oplossing beloven",
  "pain_points": ["herkenbaar probleem 1", "herkenbaar probleem 2", "herkenbaar probleem 3"],
  "benefits": ["concreet voordeel 1", "concreet voordeel 2", "concreet voordeel 3", "concreet voordeel 4"],
  "social_proof": ["500+ ondernemers gingen je voor", "In 5 minuten in je inbox", "Geld-terug garantie"],
  "faq": [
    {"question": "Hoe snel ontvang ik mijn gids?", "answer": "Binnen 5 minuten na betaling in je inbox."},
    {"question": "Is dit echt persoonlijk?", "answer": "Ja, Claude AI schrijft de gids op basis van jouw specifieke antwoorden."},
    {"question": "Wat als ik niet tevreden ben?", "answer": "We storten het bedrag terug, geen vragen gesteld."}
  ]
}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad landing response')
  const landingData = JSON.parse(stripJson(content.text))

  await supabaseAdmin.from('landing_pages').insert({
    pdf_id: pdf.id,
    ...landingData,
    generated_at: new Date().toISOString(),
  })

  return { pdfId: pdf.id, slug }
}
