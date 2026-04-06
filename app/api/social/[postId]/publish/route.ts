import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function getMetaConfig(): Promise<{ token: string; igAccountId: string } | null> {
  const { data } = await supabaseAdmin
    .from('agent_learnings')
    .select('data_points')
    .eq('insight', '__META_CONFIG__')
    .maybeSingle()

  if (data?.data_points) {
    const cfg = data.data_points as Record<string, string>
    if (cfg.meta_page_token && cfg.meta_ig_account_id) {
      return { token: cfg.meta_page_token, igAccountId: cfg.meta_ig_account_id }
    }
  }

  const token = process.env.META_ACCESS_TOKEN
  const igAccountId = process.env.META_IG_ACCOUNT_ID
  if (token && igAccountId) return { token, igAccountId }
  return null
}

function generateImageUrl(visualDescription: string): string {
  const prompt = encodeURIComponent(
    `${visualDescription}, professional social media post, clean modern design, Dutch entrepreneur, high quality`
  )
  return `https://image.pollinations.ai/prompt/${prompt}?model=flux&width=1080&height=1080&nologo=true`
}

async function postToInstagram(caption: string, imageUrl: string): Promise<string | null> {
  const config = await getMetaConfig()
  if (!config) return null
  const { token, igAccountId } = config

  try {
    const mediaUrl = new URL(`https://graph.facebook.com/v21.0/${igAccountId}/media`)
    mediaUrl.searchParams.set('caption', caption)
    mediaUrl.searchParams.set('access_token', token)
    mediaUrl.searchParams.set('image_url', imageUrl)

    const mediaRes = await fetch(mediaUrl.toString(), { method: 'POST' })
    const mediaData = await mediaRes.json() as { id?: string; error?: { message: string } }
    if (!mediaData.id) {
      console.error('Instagram media create error:', mediaData.error)
      return null
    }

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

async function postToLinkedIn(text: string): Promise<string | null> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  const authorId = process.env.LINKEDIN_AUTHOR_ID
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
  } catch {
    return null
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params

  const { data: post, error } = await supabaseAdmin
    .from('social_posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (error || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  if (post.status === 'published') {
    return NextResponse.json({ success: true, alreadyPublished: true })
  }

  const fullText = `${post.content_text}\n\n${(post.hashtags || []).join(' ')}`
  let externalId: string | null = null

  if (post.platform === 'instagram') {
    const imageUrl = generateImageUrl(post.visual_description || post.content_text.slice(0, 100))
    externalId = await postToInstagram(fullText, imageUrl)
  } else if (post.platform === 'linkedin') {
    externalId = await postToLinkedIn(fullText)
  }

  // Mark as published regardless (manual publish action)
  await supabaseAdmin
    .from('social_posts')
    .update({ status: 'published' })
    .eq('id', postId)

  return NextResponse.json({
    success: true,
    published: true,
    externalId,
    note: post.platform === 'instagram' && !externalId
      ? 'Instagram post mislukt — zorg dat je Meta account verbonden is via /dashboard/settings.'
      : null,
  })
}
