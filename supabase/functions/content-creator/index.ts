// Supabase Edge Function: content-creator
// Deno runtime — 150s max.
// Schrijft 3 platform-specifieke social posts + Pexels stockfoto's + Cloudinary overlay.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

function strip(t: string) { return t.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim() }

async function zoekFoto(zoekterm: string, platform: string): Promise<{ url: string; alt: string; asset_id?: string }> {
  // 1. Eerst brand_assets checken — pre-fetched foto's, geen API call nodig
  const { data: brandFotos } = await supabase
    .from('brand_assets')
    .select('id, url, alt, gebruik_count')
    .or(`zoekterm.ilike.%${zoekterm.split(' ')[0]}%,platform.eq.${platform}`)
    .eq('type', 'photo')
    .order('gebruik_count', { ascending: true }) // minst gebruikt eerst
    .limit(3)

  if (brandFotos?.length) {
    const foto = brandFotos[0]
    // Gebruik_count ophogen (fire-and-forget)
    supabase.from('brand_assets').update({ gebruik_count: (foto.gebruik_count || 0) + 1 }).eq('id', foto.id).then(() => {})
    return { url: foto.url, alt: foto.alt || zoekterm, asset_id: foto.id }
  }

  // 2. Fallback: live Pexels API
  const key = Deno.env.get('PEXELS_API_KEY')
  if (key) {
    try {
      const orientation = platform === 'instagram' ? 'square' : 'landscape'
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(zoekterm)}&per_page=5&orientation=${orientation}`,
        { headers: { Authorization: key } }
      )
      if (res.ok) {
        const data = await res.json()
        const foto = data.photos?.[0]
        if (foto) {
          // Sla op in brand_assets voor toekomstig gebruik
          supabase.from('brand_assets').insert({
            type: 'photo', zoekterm, pexels_id: String(foto.id),
            url: foto.src.large2x || foto.src.large, thumbnail_url: foto.src.medium,
            alt: foto.alt || zoekterm, breedte: foto.width, hoogte: foto.height,
            platform, tags: zoekterm.split(' '),
          }).then(() => {})
          return { url: foto.src.large2x || foto.src.large, alt: foto.alt || zoekterm }
        }
      }
    } catch { /* fall through */ }
  }

  // 3. Laatste fallback
  const fallbacks: Record<string, string> = {
    default: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80',
    business: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
    tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
  }
  const key2 = Object.keys(fallbacks).find(k => zoekterm.toLowerCase().includes(k)) || 'default'
  return { url: fallbacks[key2], alt: zoekterm }
}

function maakSociaalBeeld(fotoUrl: string, headline: string, platform: 'linkedin' | 'meta' | 'instagram'): string {
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')
  if (!cloudName) return fotoUrl
  const config = {
    linkedin:  { w: 1200, h: 627,  font: 'Arial_Bold', size: 48 },
    meta:      { w: 1200, h: 628,  font: 'Arial_Bold', size: 44 },
    instagram: { w: 1080, h: 1080, font: 'Arial_Bold', size: 52 },
  }
  const c = config[platform]
  const safeText = headline.slice(0, 60).replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '%20')
  const transform = [
    `w_${c.w},h_${c.h},c_fill,g_center`,
    `e_brightness:-30`,
    `l_text:${c.font}_${c.size}_bold:${safeText},co_white,g_center`,
  ].join('/')
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transform}/${encodeURIComponent(fotoUrl)}`
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  if (auth !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { run_id } = await req.json()

  async function markeerFout(reden: string) {
    await supabase.from('pipeline_runs').update({ status: 'afgewezen', afgewezen_reden: reden }).eq('id', run_id)
  }

  try {
    const { data: run } = await supabase.from('pipeline_runs').select('*, product_ideas!pipeline_runs_product_idea_id_fkey(*)').eq('id', run_id).single()
    const { data: marketingPlan } = await supabase.from('marketing_plans').select('*').eq('run_id', run_id).single()

    if (!run?.product_idea_id || !marketingPlan) {
      return new Response(JSON.stringify({ error: 'Missende data' }), { status: 400 })
    }

    const idee = run.product_ideas as Record<string, string>
    const icp = (marketingPlan.icp as Record<string, string>) || {}
    const keyMessages = (marketingPlan.key_messages as string[]) || []
    const socialPlan = (marketingPlan.social_plan as Record<string, Record<string, unknown>>) || {}

    const linkedinHaak = socialPlan?.linkedin?.haak_formule as string || ''
    const trendingThemas = (socialPlan?.linkedin?.tofu_themas as string[])?.join(', ') || ''
    const metaConcept = socialPlan?.meta?.creatief_concept as string || ''
    const positionering = (marketingPlan as Record<string, unknown>).positionering as string || ''

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
- Duidelijke CTA aan het einde (instructie, geen vraag)
- 2-3 hashtags

INSTAGRAM (emotioneel + visueel):
- Emoji's als structuurelement, niet als decoratie
- Begin met een vraag die de doelgroep zichzelf herkent
- Bullets voor leesbaarheid op mobiel
- 60-90 woorden
- 8-10 hashtags: mix groot (#ondernemen), midden (#ZZPnederland), niche

JSON (geen [...], alles volledig uitgeschreven):
{
  "linkedin": {
    "headline": "8 woorden max, pakkende zin voor op de afbeelding",
    "tekst": "volledige post 150-250 woorden",
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
    "foto_zoekterm": "3 Engelse woorden voor Pexels"
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
    "hashtags": ["#h1","#h2","#h3","#h4","#h5","#h6","#h7","#h8","#h9","#h10"],
    "foto_zoekterm": "3 Engelse woorden"
  }
}
Alleen JSON.`

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    let posts: Record<string, Record<string, unknown>>
    try { posts = JSON.parse(strip((msg.content[0] as {text:string}).text)) }
    catch { await markeerFout('Claude gaf geen geldige JSON terug'); return new Response(JSON.stringify({ error: 'Ongeldige JSON' }), { status: 500 }) }

    // Foto's parallel — eerst brand_assets, dan Pexels live
    const fallbackZoek = idee.doelgroep?.split(' ').slice(0, 3).join(' ') || 'business professional'
    const [linkedinFoto, metaFoto, instagramFoto] = await Promise.all([
      zoekFoto((posts.linkedin?.foto_zoekterm as string) || fallbackZoek, 'linkedin'),
      zoekFoto((posts.meta?.foto_zoekterm as string) || fallbackZoek, 'meta'),
      zoekFoto((posts.instagram?.foto_zoekterm as string) || fallbackZoek, 'instagram'),
    ])

    const linkedinBeeld = maakSociaalBeeld(linkedinFoto.url, posts.linkedin.headline as string, 'linkedin')
    const metaBeeld = maakSociaalBeeld(metaFoto.url, posts.meta.headline as string, 'meta')
    const instagramBeeld = maakSociaalBeeld(instagramFoto.url, posts.instagram.headline as string, 'instagram')

    const inserts = [
      { run_id, product_idea_id: run.product_idea_id, platform: 'linkedin', afbeelding_url: linkedinBeeld, afbeelding_alt: posts.linkedin.headline, tekst: posts.linkedin.tekst, hashtags: posts.linkedin.hashtags },
      { run_id, product_idea_id: run.product_idea_id, platform: 'meta', afbeelding_url: metaBeeld, afbeelding_alt: posts.meta.headline, tekst: posts.meta.tekst, hashtags: posts.meta.hashtags },
      { run_id, product_idea_id: run.product_idea_id, platform: 'instagram', afbeelding_url: instagramBeeld, afbeelding_alt: posts.instagram.headline, tekst: posts.instagram.tekst, hashtags: posts.instagram.hashtags },
    ]

    const { error } = await supabase.from('content_posts').insert(inserts)
    if (error) { await markeerFout(`DB insert: ${error.message}`); return new Response(JSON.stringify({ error: error.message }), { status: 500 }) }

    await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 4 }).eq('id', run_id)
    return new Response(JSON.stringify({ ok: true, posts: inserts.length, cloudinary: !!Deno.env.get('CLOUDINARY_CLOUD_NAME') }), { status: 200 })

  } catch (e) {
    const reden = e instanceof Error ? e.message : String(e)
    await markeerFout(`Agent crash: ${reden}`)
    return new Response(JSON.stringify({ error: reden }), { status: 500 })
  }
})
