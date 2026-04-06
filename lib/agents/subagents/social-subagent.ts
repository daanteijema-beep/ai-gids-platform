/**
 * Social Media Subagent
 * Verantwoordelijk voor: content genereren, plannen én automatisch publiceren op Meta + LinkedIn
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../../supabase'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

// ─── Image generation via Pollinations.ai (free, no API key) ────────────────
function generateImageUrl(visualDescription: string): string {
  const prompt = encodeURIComponent(
    `${visualDescription}, professional social media post, clean modern design, Dutch entrepreneur, high quality`
  )
  return `https://image.pollinations.ai/prompt/${prompt}?model=flux&width=1080&height=1080&nologo=true`
}

// Load Meta config from Supabase (set by OAuth callback) or fall back to env
async function getMetaConfig(): Promise<{ token: string; igAccountId: string } | null> {
  const { data } = await supabaseAdmin
    .from('agent_learnings')
    .select('data_points')
    .eq('insight', '__META_CONFIG__')
    .single()

  if (data?.data_points) {
    const cfg = data.data_points as Record<string, string>
    if (cfg.meta_page_token && cfg.meta_ig_account_id) {
      return { token: cfg.meta_page_token, igAccountId: cfg.meta_ig_account_id }
    }
  }

  // Fall back to env vars
  const token = process.env.META_ACCESS_TOKEN
  const igAccountId = process.env.META_IG_ACCOUNT_ID
  if (token && igAccountId) return { token, igAccountId }
  return null
}

// ─── Meta (Instagram) auto-post via Graph API ───────────────────────────────
async function postToInstagram(caption: string, imageUrl?: string): Promise<string | null> {
  const config = await getMetaConfig()
  if (!config) return null
  const { token, igAccountId } = config
  if (!token || !igAccountId) return null

  try {
    // Step 1: Create media container
    const mediaUrl = new URL(`https://graph.facebook.com/v21.0/${igAccountId}/media`)
    mediaUrl.searchParams.set('caption', caption)
    mediaUrl.searchParams.set('access_token', token)
    if (imageUrl) {
      mediaUrl.searchParams.set('image_url', imageUrl)
    } else {
      return null
    }

    const mediaRes = await fetch(mediaUrl.toString(), { method: 'POST' })
    const mediaData = await mediaRes.json() as { id?: string; error?: { message: string } }
    if (!mediaData.id) {
      console.error('Instagram media create error:', mediaData.error)
      return null
    }

    // Step 2: Publish
    const publishUrl = new URL(`https://graph.facebook.com/v21.0/${igAccountId}/media_publish`)
    publishUrl.searchParams.set('creation_id', mediaData.id)
    publishUrl.searchParams.set('access_token', token)

    const publishRes = await fetch(publishUrl.toString(), { method: 'POST' })
    const publishData = await publishRes.json() as { id?: string }
    return publishData.id || null
  } catch (err) {
    console.error('Instagram post error:', err)
    return null
  }
}

// ─── LinkedIn auto-post via API ──────────────────────────────────────────────
async function postToLinkedIn(text: string): Promise<string | null> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  const authorId = process.env.LINKEDIN_AUTHOR_ID // "urn:li:person:xxx" or "urn:li:organization:xxx"
  if (!token || !authorId) return null

  try {
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: authorId,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    })
    const data = await res.json() as { id?: string }
    return data.id || null
  } catch (err) {
    console.error('LinkedIn post error:', err)
    return null
  }
}

export async function runSocialSubagent(pdfId: string): Promise<{ postsCreated: number; postsPublished: number }> {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience)')
    .eq('id', pdfId)
    .single()

  if (!pdf) throw new Error('PDF not found')

  // Load social trends learnings
  const { data: trendLearnings } = await supabaseAdmin
    .from('agent_learnings')
    .select('insight')
    .eq('learning_type', 'content_strategy')
    .order('created_at', { ascending: false })
    .limit(10)

  const trendsContext = trendLearnings?.length
    ? `\nACTUELE TRENDS UIT RESEARCH:\n${trendLearnings.map(l => `- ${l.insight}`).join('\n')}`
    : ''

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'

  // Generate 21 posts
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    messages: [{
      role: 'user',
      content: `Maak een 3-weeks social media contentplan voor dit PDF product voor Nederlandse ondernemers.

Product: ${pdf.title}
Doelgroep: ${(pdf.pdf_ideas as any)?.target_audience}
Niche: ${(pdf.pdf_ideas as any)?.niche}
Prijs: €${pdf.price}
Link: ${baseUrl}/${pdf.slug}
${trendsContext}

Verdeling: 8x Instagram feed, 4x Instagram Reels, 6x LinkedIn, 3x TikTok script
Post types: 7x awareness, 7x interest, 7x conversion
Spread over 21 dagen (1 post/dag).

REGELS:
- Instagram: max 2200 tekens, emoji's toegestaan, relevante hashtags
- LinkedIn: zakelijker, langere tekst mag, geen emoji overdaad
- TikTok: korte pakkende hook in eerste zin, conversationeel
- Conversion posts: altijd duidelijke CTA met link naar ${baseUrl}/${pdf.slug}

Antwoord ALLEEN in dit JSON formaat:
{
  "posts": [
    {
      "platform": "instagram",
      "post_type": "awareness",
      "content_text": "volledige post tekst...",
      "hashtags": ["#zzpnederland", "#aitools"],
      "visual_description": "concreet wat er visueel bij moet — kleur, tekst op beeld, sfeer",
      "days_from_now": 1,
      "auto_publish": false
    }
  ]
}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad social response')
  const socialData = JSON.parse(stripJson(content.text))

  const now = new Date()
  let postsCreated = 0
  let postsPublished = 0

  for (const post of socialData.posts) {
    const scheduledDate = new Date(now)
    scheduledDate.setDate(scheduledDate.getDate() + (post.days_from_now || 1))

    // Try auto-publishing for today's posts (days_from_now === 1)
    let status: 'planned' | 'published' = 'planned'
    let externalPostId: string | null = null

    if (post.days_from_now <= 1 && post.auto_publish !== false) {
      const fullText = `${post.content_text}\n\n${(post.hashtags || []).join(' ')}`

      if (post.platform === 'instagram') {
        const imageUrl = post.visual_description ? generateImageUrl(post.visual_description) : undefined
        externalPostId = await postToInstagram(fullText, imageUrl)
      } else if (post.platform === 'linkedin') {
        externalPostId = await postToLinkedIn(fullText)
      }

      if (externalPostId) {
        status = 'published'
        postsPublished++
      }
    }

    await supabaseAdmin.from('social_posts').insert({
      pdf_id: pdfId,
      platform: post.platform,
      post_type: post.post_type,
      content_text: post.content_text,
      hashtags: post.hashtags || [],
      visual_description: post.visual_description || '',
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      status,
    })

    postsCreated++
  }

  return { postsCreated, postsPublished }
}
