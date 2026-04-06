/**
 * Execution Agent — Master Coordinator
 *
 * Geordende pipeline bij goedkeuring van een PDF idee:
 *   Phase 1: Website (Stripe + landing page)
 *   Phase 2: PDF content genereren (volledige gids)
 *   Phase 3: Afbeeldingen + Social posts (parallel, gebaseerd op PDF inhoud)
 *   Phase 4: Email sequenties
 *   Phase 5: Lead finder + gerichte outreach per community
 *
 * Elke fase gebruikt de output van de vorige fase als context.
 */
import { supabaseAdmin } from '../supabase'
import { runWebsiteSubagent } from './subagents/website-subagent'
import { runPdfSubagent } from './subagents/pdf-subagent'
import { runMailSubagent } from './subagents/mail-subagent'
import { runSocialSubagent } from './subagents/social-subagent'
import { runImageSubagent } from './subagents/image-subagent'
import { runLeadFinderForPdf } from './lead-finder-agent'

export async function runExecutionAgent(ideaId: string) {
  const errors: string[] = []

  // ── Phase 1: Website (creates the PDF record, must go first) ─────────────
  const { pdfId, slug } = await runWebsiteSubagent(ideaId)

  // ── Phase 2: PDF content (volledige gids, geen personalisatie per klant) ─
  let pdfChapters: string[] = []
  try {
    const result = await runPdfSubagent(pdfId)
    pdfChapters = result.chapterTitles || []
  } catch (err) {
    errors.push(`PDF: ${err}`)
    console.error('PDF subagent failed:', err)
  }

  // ── Phase 3: Afbeeldingen + Social posts (parallel, gebruik PDF context) ─
  const [imageResult, socialResult] = await Promise.allSettled([
    runImageSubagent(pdfId),
    runSocialSubagent(pdfId, pdfChapters),
  ])

  if (imageResult.status === 'rejected') {
    errors.push(`Images: ${imageResult.reason}`)
    console.error('Image subagent failed:', imageResult.reason)
  }
  if (socialResult.status === 'rejected') {
    errors.push(`Social: ${socialResult.reason}`)
    console.error('Social subagent failed:', socialResult.reason)
  }

  // ── Phase 4: Email sequenties ─────────────────────────────────────────────
  let mailSummary = 'skipped'
  try {
    const mailResult = await runMailSubagent(pdfId)
    mailSummary = `${mailResult.emailsGenerated} emails, ${mailResult.announced} announced`
  } catch (err) {
    errors.push(`Mail: ${err}`)
    console.error('Mail subagent failed:', err)
  }

  // ── Phase 5: Lead finder + gerichte outreach ──────────────────────────────
  let leadSummary = 'skipped'
  try {
    const leadResult = await runLeadFinderForPdf(pdfId)
    leadSummary = `${leadResult.communitiesFound} communities, ${leadResult.outreachGenerated} outreach`
  } catch (err) {
    errors.push(`Leads: ${err}`)
    console.error('Lead finder failed:', err)
  }

  // ── Mark idea as published ────────────────────────────────────────────────
  await supabaseAdmin
    .from('pdf_ideas')
    .update({ status: 'published' })
    .eq('id', ideaId)

  return {
    pdfId,
    slug,
    errors,
    subagents: {
      website: 'success',
      pdf: pdfChapters.length > 0 ? `${pdfChapters.length} hoofdstukken` : 'failed',
      images: imageResult.status === 'fulfilled'
        ? `${imageResult.value.imagesGenerated} images`
        : 'failed',
      social: socialResult.status === 'fulfilled'
        ? `${socialResult.value.postsCreated} posts`
        : 'failed',
      mail: mailSummary,
      leads: leadSummary,
    },
  }
}
