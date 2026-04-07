export const maxDuration = 180

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type PipelineRunRecord = {
  product_idea_id: string | null
  product_ideas: Record<string, string>
}

type MarketingPlanRecord = {
  icp: Record<string, string> | null
  key_messages: string[] | null
  social_plan: Record<string, Record<string, unknown>> | null
}

function isAuthorized(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || ''
  const auth = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  return secret === process.env.CRON_SECRET || auth === process.env.CRON_SECRET
}

function strip(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

// ─── Pexels stockfoto ──────────────────────────────────────────────────────────
async function zoekFoto(zoekterm: string): Promise<{ url: string; alt: string }> {
  const key = process.env.PEXELS_API_KEY
  if (key) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(zoekterm)}&per_page=5&orientation=landscape`,
        { headers: { Authorization: key } }
      )
      if (res.ok) {
        const data = await res.json()
        const foto = data.photos?.[0]
        if (foto) return { url: foto.src.large2x || foto.src.large, alt: foto.alt || zoekterm }
      }
    } catch { /* fall through */ }
  }
  // Fallback: Unsplash collectie URL (werkt zonder key)
  const fallbacks: Record<string, string> = {
    default: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80',
    business: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
    tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    people: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80',
  }
  const key2 = Object.keys(fallbacks).find(k => zoekterm.toLowerCase().includes(k)) || 'default'
  return { url: fallbacks[key2], alt: zoekterm }
}

// ─── Cloudinary beeldbewerking ────────────────────────────────────────────────
// Via Cloudinary URL-transforms voegen we een tekstoverlay toe aan de stockfoto.
// Dit maakt de afbeelding echt post-ready: foto + headline erin gebakken.
// Format: https://res.cloudinary.com/{cloud}/image/fetch/l_text:{font}_{size}:{tekst}/{url}
// Vereist CLOUDINARY_CLOUD_NAME env var.
function maakSociaalBeeld(
  fotoUrl: string,
  headline: string,
  platform: 'linkedin' | 'meta' | 'instagram'
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  if (!cloudName) return fotoUrl // geen bewerking zonder Cloudinary

  // Platform-specifieke dimensies en stijl
  const config: Record<string, { w: number; h: number; font: string; size: number }> = {
    linkedin:  { w: 1200, h: 627,  font: 'Arial_Bold', size: 48 },
    meta:      { w: 1200, h: 628,  font: 'Arial_Bold', size: 44 },
    instagram: { w: 1080, h: 1080, font: 'Arial_Bold', size: 52 },
  }
  const c = config[platform]

  // Headline: max 35 tekens per regel, newlines als %0A
  const safeText = headline.slice(0, 60).replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '%20')

  const transform = [
    `w_${c.w},h_${c.h},c_fill,g_center`,
    `e_brightness:-30`,                                              // foto dimmen voor leesbaarheid
    `l_text:${c.font}_${c.size}_bold:${safeText},co_white,g_center`, // witte tekst gecentreerd
  ].join('/')

  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transform}/${encodeURIComponent(fotoUrl)}`
}

// ─── Claude schrijft posts ─────────────────────────────────────────────────────
async function schrijfPosts(
  idee: Record<string, string>,
  icp: Record<string, string>,
  keyMessages: string[],
  socialPlan: Record<string, Record<string, unknown>>
) {
  // Gebruik de trending thema's uit het marketing plan als input voor de posts.
  // Dit koppelt de content direct aan wat nu viraal gaat op elk platform.
  const linkedinHaak = socialPlan?.linkedin?.haak_formule || ''
  const trendingThemas = (socialPlan?.linkedin?.trending_themas as string[])?.join(', ') || ''
  const metaConcept = socialPlan?.meta?.creatief_concept || ''

  // Meta Ads Advantage+ structuur voor Meta post
  // LinkedIn: thought leadership haak → inzicht → bewijs → zachte CTA
  // Instagram: emotioneel + visueel, emoji-gedreven
  const positionering = (socialPlan as Record<string, unknown>)?.positionering as string || ''
  const prompt = `Je schrijft DEFINITIEVE social media posts voor ${idee.naam} — publicatieklaar, geen placeholders.

PRODUCT: ${idee.naam} — ${idee.tagline}
DOELGROEP: ${icp.functietitel || idee.doelgroep}
PIJNPUNT: ${idee.pijnpunt}
KERNBOODSCHAPPEN: ${keyMessages.slice(0, 3).join(' | ')}
PRIJS: ${idee.prijsindicatie}
POSITIONERING: ${positionering}
LinkedIn haak-formule: ${linkedinHaak}
Trending thema's: ${trendingThemas}
Meta creatief concept: ${metaConcept}

PLATFORM-SPECIFIEKE EISEN:

LINKEDIN (thought leadership structuur):
- Begin met een statement die STOPT met scrollen: stelling, statistiek, of contraire visie
- Structuur: haak → herkenbaar probleem uitlichten → inzicht/draaipunt → zachte CTA
- 150-250 woorden, professioneel maar menselijk
- Geen bullet points in de eerste alinea
- 3-5 relevante hashtags onderaan

META (Advantage+ advertentie structuur):
- Eerste 3 woorden bepalen of iemand stopt — begin met het pijnpunt of resultaat
- Direct, resultaatgericht, urgentie zonder druk
- 80-120 woorden
- Duidelijke CTA aan het einde (geen vraag, een instructie)
- 2-3 hashtags

INSTAGRAM (emotioneel + visueel):
- Emoji's als structuurelement, niet als decoratie
- Begin met een vraag die de doelgroep zichzelf herkent
- Bullets voor leesbaarheid op mobiel
- 60-90 woorden
- 8-10 hashtags: mix groot (#ondernemen 500K+), midden (#ZZPnederland 50K), niche

JSON (geen [...] of placeholders, alles volledig uitgeschreven):
{
  "linkedin": {
    "headline": "8 woorden max, pakkende zin voor op de afbeelding",
    "tekst": "volledige post 150-250 woorden",
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
    "foto_zoekterm": "3 Engelse woorden voor Pexels zoekopdracht"
  },
  "meta": {
    "headline": "6 woorden max voor op de afbeelding",
    "tekst": "volledige post 80-120 woorden",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "foto_zoekterm": "3 Engelse woorden"
  },
  "instagram": {
    "headline": "6 woorden max voor op de afbeelding",
    "tekst": "volledige post 60-90 woorden met emoji's",
    "hashtags": ["#h1", "#h2", "#h3", "#h4", "#h5", "#h6", "#h7", "#h8", "#h9", "#h10"],
    "foto_zoekterm": "3 Engelse woorden"
  }
}
Alleen JSON.`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  })
  return JSON.parse(strip((msg.content[0] as { text: string }).text))
}

// ─── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { run_id } = await req.json()

  const runResponse = await supabaseAdmin
    .from('pipeline_runs')
    .select('*, product_ideas!pipeline_runs_product_idea_id_fkey(*)')
    .eq('id', run_id)
    .single()
  const run = runResponse.data as PipelineRunRecord | null

  const marketingPlanResponse = await supabaseAdmin
    .from('marketing_plans')
    .select('*')
    .eq('run_id', run_id)
    .single()
  const marketingPlan = marketingPlanResponse.data as MarketingPlanRecord | null

  if (!run?.product_idea_id || !marketingPlan) return NextResponse.json({ error: 'Missende data' }, { status: 400 })

  const idee = run.product_ideas
  const icp = marketingPlan.icp || {}
  const keyMessages = marketingPlan.key_messages || []
  const socialPlan = marketingPlan.social_plan || {}

  const posts = await schrijfPosts(idee, icp, keyMessages, socialPlan)

  // Foto's parallel ophalen
  const [linkedinFoto, metaFoto, instagramFoto] = await Promise.all([
    zoekFoto(posts.linkedin.foto_zoekterm),
    zoekFoto(posts.meta.foto_zoekterm),
    zoekFoto(posts.instagram.foto_zoekterm),
  ])

  // Cloudinary beeldbewerking: headline ingebakken in de foto
  const linkedinBeeld = maakSociaalBeeld(linkedinFoto.url, posts.linkedin.headline, 'linkedin')
  const metaBeeld     = maakSociaalBeeld(metaFoto.url,     posts.meta.headline,     'meta')
  const instagramBeeld = maakSociaalBeeld(instagramFoto.url, posts.instagram.headline, 'instagram')

  const inserts = [
    {
      run_id, product_idea_id: run.product_idea_id,
      platform: 'linkedin' as const,
      afbeelding_url: linkedinBeeld,
      afbeelding_alt: posts.linkedin.headline,
      tekst: posts.linkedin.tekst,
      hashtags: posts.linkedin.hashtags,
    },
    {
      run_id, product_idea_id: run.product_idea_id,
      platform: 'meta' as const,
      afbeelding_url: metaBeeld,
      afbeelding_alt: posts.meta.headline,
      tekst: posts.meta.tekst,
      hashtags: posts.meta.hashtags,
    },
    {
      run_id, product_idea_id: run.product_idea_id,
      platform: 'instagram' as const,
      afbeelding_url: instagramBeeld,
      afbeelding_alt: posts.instagram.headline,
      tekst: posts.instagram.tekst,
      hashtags: posts.instagram.hashtags,
    },
  ]

  const { error } = await supabaseAdmin.from('content_posts').insert(inserts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('pipeline_runs')
    .update({ status: 'wacht_op_goedkeuring', huidige_stap: 4 })
    .eq('id', run_id)

  return NextResponse.json({ ok: true, posts: inserts.length, cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME })
}
