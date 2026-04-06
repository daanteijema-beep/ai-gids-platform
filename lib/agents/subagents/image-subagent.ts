/**
 * Image Subagent
 * Gebruikt picsum.photos (gratis, altijd beschikbaar, mooie foto's, geen API key):
 *   - 1 hero banner  (1200×630) voor de landingspagina
 *   - 1 PDF cover    (800×1100)
 *   - 3 Instagram posts (1080×1080)
 *
 * picsum.photos/seed/{seed}/{w}/{h} geeft altijd dezelfde foto voor hetzelfde seed.
 * We baseren de seed op de niche zodat vergelijkbare producten vergelijkbare stijl krijgen.
 */
import { supabaseAdmin } from '../../supabase'

// Deterministic seed from string
function toSeed(str: string, offset = 0): number {
  let hash = offset * 1000
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffff
  }
  return Math.abs(hash) || (offset + 1) * 137
}

function picsum(width: number, height: number, seed: number): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`
}

export async function runImageSubagent(pdfId: string): Promise<{ imagesGenerated: number }> {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience)')
    .eq('id', pdfId)
    .single()

  if (!pdf) throw new Error('PDF not found')

  const niche = ((pdf.pdf_ideas as any)?.niche || 'ondernemer').toLowerCase()

  const images = {
    hero_banner: picsum(1200, 630,  toSeed(niche, 0)),
    pdf_cover:   picsum(800,  1100, toSeed(niche, 1)),
    instagram: [
      picsum(1080, 1080, toSeed(niche, 2)),
      picsum(1080, 1080, toSeed(niche, 3)),
      picsum(1080, 1080, toSeed(niche, 4)),
    ],
  }

  await supabaseAdmin
    .from('pdfs')
    .update({ images })
    .eq('id', pdfId)

  return { imagesGenerated: 4 }
}
