/**
 * Image Subagent
 * Genereert via Pollinations.ai (gratis, geen API key):
 *   - 1 hero banner  (1200×630) voor de landingspagina
 *   - 1 PDF cover    (800×1100) — ook gebruikt als Instagram post
 *   - 2 extra Instagram posts (1080×1080)
 *
 * De PDF cover wordt ook opgeslagen als eerste Instagram-afbeelding,
 * zodat je dezelfde branded visual op social gebruikt.
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../../supabase'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

function pollinationsUrl(prompt: string, width: number, height: number, seed?: number): string {
  const fullPrompt = `${prompt}, ultra high quality, 8k, professional photography, sharp focus, beautiful lighting`
  const encoded = encodeURIComponent(fullPrompt)
  const s = seed ?? Math.floor(Math.random() * 999999)
  return `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=${width}&height=${height}&nologo=true&seed=${s}`
}

export async function runImageSubagent(pdfId: string): Promise<{ imagesGenerated: number }> {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience)')
    .eq('id', pdfId)
    .single()

  if (!pdf) throw new Error('PDF not found')

  const niche = (pdf.pdf_ideas as any)?.niche || 'ZZP ondernemer'
  const audience = (pdf.pdf_ideas as any)?.target_audience || 'Nederlandse ondernemers'
  const title = pdf.title

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Schrijf 4 gedetailleerde visuele prompts (Engels) voor AI-afbeeldingen voor dit product.

Product: "${title}"
Niche: ${niche}
Doelgroep: ${audience}

Stijlrichtlijn:
- Gebruik indigo/paars als hoofdkleur (#4f46e5)
- Modern, clean, professioneel — niet cheesy of goedkoop
- Geen tekst beschrijven in de afbeelding
- Denk aan: sfeer, compositie, kleuren, licht, elementen

Maak deze 4 prompts:

1. hero_banner: Brede landingspagina banner, 2:1 formaat. Inspirerend, licht, modern kantoor of werkomgeving. Iemand achter laptop/bureau met focus en succes-gevoel. Indigo/wit kleurpallet.

2. pdf_cover: Portret/A4 stijl. Elegant, premium boek/rapport gevoel. Abstracte vormen of iconen die passen bij de niche. Donkere achtergrond met indigo en goud of wit accenten. Moet er professioneel en waardevol uitzien.

3. instagram_tip: Vierkant, modern infographic-sfeer. Licht achtergrond, indigo accenten. Iemand die productief werkt, of een scherm/diagram. Clean en aansprekend.

4. instagram_lifestyle: Vierkant, lifestyle sfeer passend bij de doelgroep. Authentiek, menselijk, positief. Kleuren warm maar modern.

Geef terug als JSON (GEEN markdown):
{
  "hero_banner": "prompt...",
  "pdf_cover": "prompt...",
  "instagram_tip": "prompt...",
  "instagram_lifestyle": "prompt..."
}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad image prompt response')

  let prompts: any
  try {
    prompts = JSON.parse(stripJson(content.text))
  } catch (e) {
    console.error('Image subagent JSON parse error:', content.text.substring(0, 300))
    throw new Error('Failed to parse image prompts JSON')
  }

  // Generate a consistent seed for the cover so hero and cover have the same style
  const coverSeed = Math.floor(Math.random() * 999999)

  // Build PDF cover URL (portrait)
  const pdfCoverUrl = pollinationsUrl(prompts.pdf_cover, 800, 1100, coverSeed)
  // Build a square crop version of the same cover for Instagram
  const instaCoverUrl = pollinationsUrl(prompts.pdf_cover, 1080, 1080, coverSeed)

  const images = {
    hero_banner: pollinationsUrl(prompts.hero_banner, 1200, 630),
    pdf_cover: pdfCoverUrl,
    instagram: [
      instaCoverUrl,                                              // cover = first Instagram post
      pollinationsUrl(prompts.instagram_tip, 1080, 1080),
      pollinationsUrl(prompts.instagram_lifestyle, 1080, 1080),
    ],
    prompts,
  }

  await supabaseAdmin
    .from('pdfs')
    .update({ images })
    .eq('id', pdfId)

  return { imagesGenerated: 4 }
}
