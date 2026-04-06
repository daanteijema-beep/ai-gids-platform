/**
 * Image Subagent
 * Genereert via Pollinations.ai (gratis, geen API key):
 *   - 1 hero banner  (1200×630) voor de landingspagina
 *   - 3 Instagram posts (1080×1080) voor social content
 *   - 1 PDF cover     (800×1100) voor de PDF zelf
 *
 * Claude schrijft eerst gedetailleerde visuele prompts op basis van niche/titel,
 * daarna worden de Pollinations-URLs opgebouwd en opgeslagen in pdfs.images.
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../../supabase'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

function pollinationsUrl(prompt: string, width: number, height: number): string {
  const encoded = encodeURIComponent(
    `${prompt}, professional, high quality, clean modern design, Dutch business`
  )
  return `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 100000)}`
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

  // Ask Claude for 5 detailed visual prompts
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Maak 5 gedetailleerde visuele prompts (in het Engels) voor AI-gegenereerde afbeeldingen voor dit PDF product.

Product: ${pdf.title}
Niche: ${niche}
Doelgroep: ${audience}

Regels:
- Prompts moeten werken voor Flux/Stable Diffusion image generation
- Beschrijf kleuren, compositie, sfeer, elementen
- Stijl: modern, professioneel, licht en clean, past bij Nederlandse ZZP markt
- Geen tekst in de afbeeldingen beschrijven
- Indigo/paars als primaire kleur past bij het merk

Maak deze 5 prompts:
1. hero_banner: brede banner voor website hero, horizontaal, inspirerend
2. instagram_awareness: sfeervolle awareness post, persoon of concept
3. instagram_interest: tips/informatie sfeer, visueel aantrekkelijk
4. instagram_conversion: actiegericht, product gevoel, professioneel
5. pdf_cover: portret/A4 formaat, cover van een zakelijk rapport/gids

Antwoord ALLEEN in dit JSON formaat:
{
  "hero_banner": "detailed visual prompt...",
  "instagram_awareness": "detailed visual prompt...",
  "instagram_interest": "detailed visual prompt...",
  "instagram_conversion": "detailed visual prompt...",
  "pdf_cover": "detailed visual prompt..."
}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad image prompt response')
  const prompts = JSON.parse(stripJson(content.text))

  // Build Pollinations URLs
  const images = {
    hero_banner: pollinationsUrl(prompts.hero_banner, 1200, 630),
    instagram: [
      pollinationsUrl(prompts.instagram_awareness, 1080, 1080),
      pollinationsUrl(prompts.instagram_interest, 1080, 1080),
      pollinationsUrl(prompts.instagram_conversion, 1080, 1080),
    ],
    pdf_cover: pollinationsUrl(prompts.pdf_cover, 800, 1100),
    prompts, // store prompts too so we can regenerate
  }

  // Save to pdfs.images
  await supabaseAdmin
    .from('pdfs')
    .update({ images })
    .eq('id', pdfId)

  return { imagesGenerated: 5 }
}
