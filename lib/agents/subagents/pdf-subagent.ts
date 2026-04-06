/**
 * PDF Subagent — genereert de volledige PDF bij approval
 * Als er al een draft_pdf_html in pdf_ideas staat, wordt die hergebruikt.
 * Anders wordt de content opnieuw gegenereerd.
 *
 * Opslag:
 *   - pdfs.generated_pdf_html  → complete HTML (klaar voor email delivery)
 *   - pdf_templates             → chapter-lijst voor dashboard weergave
 */
import { supabaseAdmin } from '../../supabase'
import { generatePdfContent } from './pdf-content-generator'

export async function runPdfSubagent(pdfId: string): Promise<{ chapters: number; chapterTitles: string[] }> {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience, problem_solved, product_type, draft_pdf_html)')
    .eq('id', pdfId)
    .single()

  if (!pdf) throw new Error('PDF not found')

  const ideaData = pdf.pdf_ideas as any
  const niche = ideaData?.niche || 'ondernemer'
  const doelgroep = ideaData?.target_audience || 'Nederlandse ZZP\'er'
  const probleem = ideaData?.problem_solved || ''
  const productType = ideaData?.product_type || 'swipe_file'

  let html: string
  let chapterTitles: string[]

  // Reuse draft if already generated during research
  if (ideaData?.draft_pdf_html) {
    html = ideaData.draft_pdf_html
    // Extract chapter titles from stored template if available
    const { data: existing } = await supabaseAdmin
      .from('pdf_templates')
      .select('chapters')
      .eq('pdf_id', pdfId)
      .maybeSingle()
    chapterTitles = (existing?.chapters as any[] || []).map((ch: any) => ch.title)
  } else {
    // Generate from scratch
    const result = await generatePdfContent({
      title: pdf.title,
      subtitle: pdf.subtitle || '',
      niche,
      doelgroep,
      probleem,
      product_type: productType,
    })
    html = result.html
    chapterTitles = result.chapterTitles
  }

  // Save generated HTML to pdfs table
  await supabaseAdmin
    .from('pdfs')
    .update({ generated_pdf_html: html })
    .eq('id', pdfId)

  // Save chapter structure to pdf_templates for dashboard display
  if (chapterTitles.length > 0) {
    await supabaseAdmin.from('pdf_templates').upsert({
      pdf_id: pdfId,
      niche,
      tone_of_voice: 'direct, praktisch, jij-vorm',
      chapters: chapterTitles.map((title, i) => ({
        number: i + 1,
        title,
        prompt_instructions: '',
        word_count_target: 400,
        variables_used: [],
      })),
      intro_template: '',
      outro_template: '',
      variable_map: { cover_page: { title: pdf.title, subtitle: pdf.subtitle } },
    }, { onConflict: 'pdf_id' })
  }

  return { chapters: chapterTitles.length, chapterTitles }
}
