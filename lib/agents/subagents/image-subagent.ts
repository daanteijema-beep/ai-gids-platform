/**
 * Image Subagent
 * Gebruikt Unsplash source URLs (gratis, commercieel gebruik, geen API key):
 *   - 1 hero banner  (1200×630) voor de landingspagina
 *   - 1 PDF cover    (800×1100)
 *   - 3 Instagram posts (1080×1080)
 *
 * source.unsplash.com geeft telkens een andere foto terug op basis van trefwoorden.
 * We voegen een cachebuster toe zodat elke post een unieke foto krijgt.
 */
import { supabaseAdmin } from '../../supabase'
import { BRAND } from '../../brand'

function unsplash(width: number, height: number, keywords: string, bust?: number): string {
  const kw = encodeURIComponent(keywords)
  const b = bust !== undefined ? bust : Math.floor(Math.random() * 9999)
  // Unsplash source doesn't support cachebuster in path, but different keyword combos give different photos
  return `https://source.unsplash.com/${width}x${height}/?${kw}&sig=${b}`
}

export async function runImageSubagent(pdfId: string): Promise<{ imagesGenerated: number }> {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience)')
    .eq('id', pdfId)
    .single()

  if (!pdf) throw new Error('PDF not found')

  const niche = (pdf.pdf_ideas as any)?.niche || 'ondernemen'
  const n = niche.toLowerCase()

  const images = {
    hero_banner: unsplash(1200, 630, `${n},entrepreneur,laptop,professional,office`, 1),
    pdf_cover:   unsplash(800, 1100, `${n},professional,minimal,desk,clean`, 2),
    instagram: [
      unsplash(1080, 1080, `${n},business,workspace,success`, 3),
      unsplash(1080, 1080, `${n},entrepreneur,focus,laptop`, 4),
      unsplash(1080, 1080, `${n},lifestyle,work,modern,bright`, 5),
    ],
  }

  await supabaseAdmin
    .from('pdfs')
    .update({ images })
    .eq('id', pdfId)

  return { imagesGenerated: 4 }
}
