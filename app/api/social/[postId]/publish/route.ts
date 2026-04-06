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

async function postToInstagram(caption: string): Promise<string | null> {
  const config = await getMetaConfig()
  if (!config) return null

  try {
    // Instagram requires an image for feed posts — skip if no image
    // Text-only is not supported on Instagram feed; return null gracefully
    return null
  } catch {
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
    externalId = await postToInstagram(fullText)
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
      ? 'Instagram auto-post vereist een afbeelding — verbind je Meta account en upload via de Instagram app.'
      : null,
  })
}
