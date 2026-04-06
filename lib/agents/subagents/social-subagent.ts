/**
 * Social Media Subagent
 * Genereert 3 Instagram posts + 3 Facebook posts per PDF product.
 * Eenvoudig en betrouwbaar — kwaliteit boven kwantiteit.
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../../supabase'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

export async function runSocialSubagent(pdfId: string, pdfChapters: string[] = []): Promise<{ postsCreated: number; postsPublished: number }> {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience)')
    .eq('id', pdfId)
    .single()

  if (!pdf) throw new Error('PDF not found')

  const niche = (pdf.pdf_ideas as any)?.niche || ''
  const doelgroep = (pdf.pdf_ideas as any)?.target_audience || 'Nederlandse ZZP\'ers'
  const metaHook = (pdf.pdf_ideas as any)?.meta_hook || ''
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'
  const link = `${baseUrl}/${pdf.slug}`
  const chaptersContext = pdfChapters.length > 0
    ? `\nHoofdstukken in de gids: ${pdfChapters.map((t, i) => `${i + 1}. ${t}`).join(' | ')}`
    : ''

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Schrijf 6 social media posts voor dit PDF product. 3 voor Instagram, 3 voor Facebook.

Product: ${pdf.title}
Niche: ${niche}
Doelgroep: ${doelgroep}
Meta hook: ${metaHook}
Link: ${link}
Prijs: €${pdf.price}${chaptersContext}

POSTS VERDELING:
- Instagram: 1x awareness (probleem benoemen), 1x interest (waarde tonen), 1x conversion (directe verkoop)
- Facebook: 1x awareness, 1x interest, 1x conversion

REGELS:
- Instagram: persoonlijk, visueel, emoji's ok, 150-300 woorden + hashtags
- Facebook: iets langer mag, zakelijker, minder emoji's, geen hashtags nodig
- Conversion posts: altijd link naar ${link}
- Schrijf in jij-vorm, niet formeel

Geef antwoord als JSON (GEEN markdown blokken, direct JSON):
{
  "posts": [
    {
      "platform": "instagram",
      "post_type": "awareness",
      "content_text": "volledige post tekst...",
      "hashtags": ["#zzpnederland", "#ondernemen"],
      "visual_description": "beschrijf concreet wat op het beeld moet staan — kleuren, sfeer, elementen",
      "days_from_now": 1
    }
  ]
}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad social response')

  let socialData: { posts: any[] }
  try {
    socialData = JSON.parse(stripJson(content.text))
  } catch (e) {
    console.error('Social subagent JSON parse error. Raw text:', content.text.substring(0, 300))
    throw new Error('Failed to parse social posts JSON')
  }

  const now = new Date()
  let postsCreated = 0

  for (const post of (socialData.posts || [])) {
    const scheduledDate = new Date(now)
    scheduledDate.setDate(scheduledDate.getDate() + (post.days_from_now || 1))

    // Validate post_type is one of the allowed values
    const postType = ['awareness', 'interest', 'conversion'].includes(post.post_type)
      ? post.post_type
      : 'awareness'

    // Map facebook to instagram platform (DB only allows instagram/linkedin/tiktok)
    // Store facebook posts as a separate column or use linkedin slot
    const platform = post.platform === 'facebook' ? 'instagram' : (
      ['instagram', 'linkedin', 'tiktok'].includes(post.platform) ? post.platform : 'instagram'
    )

    try {
      await supabaseAdmin.from('social_posts').insert({
        pdf_id: pdfId,
        platform,
        post_type: postType,
        content_text: post.content_text || '',
        hashtags: post.hashtags || [],
        visual_description: post.visual_description || '',
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        status: 'planned',
      })
      postsCreated++
    } catch (err) {
      console.error('Failed to insert social post:', err)
    }
  }

  return { postsCreated, postsPublished: 0 }
}
