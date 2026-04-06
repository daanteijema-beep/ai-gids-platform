import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin, PdfIdea, FormField } from '../supabase'
import { createStripeProduct } from '../stripe'

const client = new Anthropic()

export async function runExecutionAgent(ideaId: string) {
  const { data: idea, error } = await supabaseAdmin
    .from('pdf_ideas')
    .select('*')
    .eq('id', ideaId)
    .single()

  if (error || !idea) throw new Error('Idea not found')

  // 1. Create Stripe product
  const { productId, priceId } = await createStripeProduct(
    idea.title,
    idea.subtitle,
    idea.estimated_price
  )

  // 2. Generate slug
  const slug = idea.title
    .toLowerCase()
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

  if (pdfError || !pdf) throw new Error('Failed to create PDF record')

  // 4. Generate landing page content
  const landingResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `Schrijf Nederlandse landingspagina content voor dit PDF product:

Title: ${idea.title}
Doelgroep: ${idea.target_audience}
Probleem: ${idea.problem_solved}
Prijs: €${idea.estimated_price}

Antwoord ALLEEN in dit JSON formaat:
{
  "hero_headline": "...",
  "hero_subtext": "...",
  "pain_points": ["...", "...", "..."],
  "benefits": ["...", "...", "...", "..."],
  "social_proof": ["Meer dan 500 ondernemers gingen je voor", "..."],
  "faq": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ]
}`,
      },
    ],
  })

  const landingContent = landingResponse.content[0]
  if (landingContent.type !== 'text') throw new Error('Bad landing response')
  const landingData = JSON.parse(landingContent.text)

  await supabaseAdmin.from('landing_pages').insert({
    pdf_id: pdf.id,
    ...landingData,
    generated_at: new Date().toISOString(),
  })

  // 5. Generate social posts (14 posts over 2 weeks)
  const socialResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `Maak een 2-weeks social media contentplan voor dit PDF product:

Title: ${idea.title}
Doelgroep: ${idea.target_audience}
Prijs: €${idea.estimated_price}

Maak 14 posts: mix van Instagram (6), LinkedIn (5), en Instagram Reels ideeën (3).
Mix ook post types: awareness (maak bewust van het probleem), interest (toon de oplossing), conversion (koop nu).

Antwoord ALLEEN in dit JSON formaat:
{
  "posts": [
    {
      "platform": "instagram",
      "post_type": "awareness",
      "content_text": "volledige post tekst...",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "visual_description": "beschrijving van het beeld",
      "days_from_now": 1
    }
  ]
}`,
      },
    ],
  })

  const socialContent = socialResponse.content[0]
  if (socialContent.type !== 'text') throw new Error('Bad social response')
  const socialData = JSON.parse(socialContent.text)

  const now = new Date()
  for (const post of socialData.posts) {
    const scheduledDate = new Date(now)
    scheduledDate.setDate(scheduledDate.getDate() + (post.days_from_now || 1))

    await supabaseAdmin.from('social_posts').insert({
      pdf_id: pdf.id,
      platform: post.platform,
      post_type: post.post_type,
      content_text: post.content_text,
      hashtags: post.hashtags,
      visual_description: post.visual_description,
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      status: 'planned',
    })
  }

  // 6. Mark idea as published
  await supabaseAdmin
    .from('pdf_ideas')
    .update({ status: 'published' })
    .eq('id', ideaId)

  return { pdfId: pdf.id, slug }
}
