import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

const PROMPTS: Record<string, (niche: string, zoekterm: string) => string> = {
  cold_email_sequence: (niche, zoekterm) => `
Je bent een sales expert voor VakwebTwente — een dienst die professionele websites met slimme aanvraagflows bouwt voor ${niche} in Twente (€79–€149/maand).

Schrijf een cold email reeks van 3 emails voor het benaderen van ${niche} die (nog) geen goede website hebben.
Elke email is max 5 zinnen, informeel maar professioneel, jij-vorm, specifiek voor ${zoekterm}s.

Geef terug als JSON array:
[
  { "dag": 1, "onderwerp": "...", "tekst": "..." },
  { "dag": 4, "onderwerp": "...", "tekst": "..." },
  { "dag": 10, "onderwerp": "...", "tekst": "..." }
]
Alleen JSON.`,

  linkedin_posts: (niche) => `
Schrijf 5 LinkedIn posts voor VakwebTwente gericht op ${niche} in Twente.
Mix van: pijnpunt post, resultaat post, educatie post, social proof post, CTA post.
Elke post max 150 woorden, inclusief 3-5 hashtags.

Geef terug als JSON array:
[
  { "type": "pijnpunt", "titel": "...", "tekst": "...", "hashtags": ["#...", "..."] },
  ...
]
Alleen JSON.`,

  instagram_posts: (niche) => `
Schrijf 5 Instagram posts voor VakwebTwente gericht op ${niche} in Twente.
Korte, pakkende teksten met emoji's. Elke post max 100 woorden + 5 hashtags.
Thema's: voor/na website, meer aanvragen, minder gemiste oproepen, professioneel uitstralen, klantreviews.

JSON array:
[
  { "thema": "...", "tekst": "...", "hashtags": ["..."] },
  ...
]
Alleen JSON.`,

  landing_page_copy: (niche, zoekterm) => `
Schrijf volledige landingspagina tekst voor VakwebTwente specifiek voor ${niche} in Twente.
Product: website + slimme aanvraagflow voor ${zoekterm}s, €79–€149/maand.

Geef terug als JSON:
{
  "hero_headline": "...",
  "hero_subline": "...",
  "pijnpunten": ["...", "...", "..."],
  "voordelen": [{ "titel": "...", "tekst": "..." }, ...],
  "sociale_bewijzen": ["...", "..."],
  "faq": [{ "vraag": "...", "antwoord": "..." }, ...],
  "cta_tekst": "..."
}
Alleen JSON.`,

  whatsapp_script: (niche, zoekterm) => `
Schrijf een WhatsApp-berichtscript voor VakwebTwente om ${niche} te benaderen.
3 berichten: eerste contact, follow-up na 2 dagen, laatste kans na 5 dagen.
Informeel, kort, max 2 zinnen per bericht. Eindig met een concrete uitnodiging.

JSON array:
[
  { "dag": 1, "bericht": "..." },
  { "dag": 3, "bericht": "..." },
  { "dag": 6, "bericht": "..." }
]
Alleen JSON.`,
}

export async function POST(req: NextRequest) {
  const { niche_id, type } = await req.json()

  if (!niche_id || !type) {
    return NextResponse.json({ error: 'niche_id en type zijn verplicht' }, { status: 400 })
  }

  // Haal niche op
  const { data: niche } = await supabaseAdmin
    .from('niches')
    .select('*')
    .eq('id', niche_id)
    .single()

  if (!niche) {
    return NextResponse.json({ error: 'Niche niet gevonden' }, { status: 404 })
  }

  const promptFn = PROMPTS[type]
  if (!promptFn) {
    return NextResponse.json({ error: 'Onbekend type' }, { status: 400 })
  }

  // Haal recentste trend insights op voor deze niche
  const { data: insights } = await supabaseAdmin
    .from('content_insights')
    .select('bron, titel, samenvatting, aanbevolen_hook')
    .eq('niche_id', niche_id)
    .order('created_at', { ascending: false })
    .limit(6)

  const trendContext = insights?.length
    ? `\n\nACTUELE TREND DATA VOOR DEZE NICHE (gebruik deze inzichten):\n` +
      insights.map(i => `[${i.bron}] ${i.titel}: ${i.samenvatting}`).join('\n') +
      (insights[0]?.aanbevolen_hook ? `\n\nAanbevolen hook deze week: "${insights[0].aanbevolen_hook}"` : '')
    : ''

  const prompt = promptFn(niche.naam, niche.sector_zoekterm) + trendContext

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { text: string }).text
  let content: unknown
  try {
    content = JSON.parse(stripJson(raw))
  } catch {
    content = { raw }
  }

  const { error } = await supabaseAdmin.from('marketing_content').insert({
    niche_id,
    type,
    titel: `${niche.naam} — ${type.replace('_', ' ')}`,
    content,
    status: 'draft',
  })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, content })
}
