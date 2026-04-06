/**
 * Execution Agent — Coordinator
 * Wordt getriggerd bij goedkeuring van een PDF idee.
 * Roept 5 subagents aan:
 *   1. Website Subagent  → Stripe, landing page
 *   2. PDF Subagent      → niche template
 *   3. Mail Subagent     → email sequenties + aankondiging
 *   4. Social Subagent   → content + auto-publish
 *   5. Image Subagent    → hero, Instagram posts, PDF cover via Pollinations.ai
 */
import { supabaseAdmin } from '../supabase'
import { runWebsiteSubagent } from './subagents/website-subagent'
import { runPdfSubagent } from './subagents/pdf-subagent'
import { runMailSubagent } from './subagents/mail-subagent'
import { runSocialSubagent } from './subagents/social-subagent'
import { runImageSubagent } from './subagents/image-subagent'

export async function runExecutionAgent(ideaId: string) {
  // Step 1: Website subagent — must run first (creates the PDF record)
  const { pdfId, slug } = await runWebsiteSubagent(ideaId)

  // Step 2: Run all subagents in parallel (all need pdfId)
  const [pdfResult, mailResult, socialResult, imageResult] = await Promise.allSettled([
    runPdfSubagent(pdfId),
    runMailSubagent(pdfId),
    runSocialSubagent(pdfId),
    runImageSubagent(pdfId),
  ])

  if (pdfResult.status === 'rejected') console.error('PDF subagent failed:', pdfResult.reason)
  if (mailResult.status === 'rejected') console.error('Mail subagent failed:', mailResult.reason)
  if (socialResult.status === 'rejected') console.error('Social subagent failed:', socialResult.reason)
  if (imageResult.status === 'rejected') console.error('Image subagent failed:', imageResult.reason)

  // Step 3: Mark idea as published
  await supabaseAdmin
    .from('pdf_ideas')
    .update({ status: 'published' })
    .eq('id', ideaId)

  return {
    pdfId,
    slug,
    subagents: {
      website: 'success',
      pdf: pdfResult.status === 'fulfilled' ? `${pdfResult.value.chapters} chapters` : 'failed',
      mail: mailResult.status === 'fulfilled'
        ? `${mailResult.value.emailsGenerated} emails, ${mailResult.value.announced} announced`
        : 'failed',
      social: socialResult.status === 'fulfilled'
        ? `${socialResult.value.postsCreated} posts, ${socialResult.value.postsPublished} published`
        : 'failed',
      images: imageResult.status === 'fulfilled'
        ? `${imageResult.value.imagesGenerated} images generated`
        : 'failed',
    },
  }
}
