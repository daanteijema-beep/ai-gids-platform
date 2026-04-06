/**
 * Execution Agent — Coordinator
 * Wordt getriggerd bij goedkeuring van een PDF idee.
 * Roept 4 subagents aan die parallel kunnen draaien:
 *   1. Website Subagent  → Stripe, landing page
 *   2. PDF Subagent      → niche template
 *   3. Mail Subagent     → email sequenties + aankondiging
 *   4. Social Subagent   → content + auto-publish
 */
import { supabaseAdmin } from '../supabase'
import { runWebsiteSubagent } from './subagents/website-subagent'
import { runPdfSubagent } from './subagents/pdf-subagent'
import { runMailSubagent } from './subagents/mail-subagent'
import { runSocialSubagent } from './subagents/social-subagent'

export async function runExecutionAgent(ideaId: string) {
  // Step 1: Website subagent — must run first (creates the PDF record)
  const { pdfId, slug } = await runWebsiteSubagent(ideaId)

  // Step 2: Run PDF, Mail, Social subagents in parallel (all need pdfId)
  const [pdfResult, mailResult, socialResult] = await Promise.allSettled([
    runPdfSubagent(pdfId),
    runMailSubagent(pdfId),
    runSocialSubagent(pdfId),
  ])

  // Log any subagent failures (don't throw — partial success is acceptable)
  if (pdfResult.status === 'rejected') {
    console.error('PDF subagent failed:', pdfResult.reason)
  }
  if (mailResult.status === 'rejected') {
    console.error('Mail subagent failed:', mailResult.reason)
  }
  if (socialResult.status === 'rejected') {
    console.error('Social subagent failed:', socialResult.reason)
  }

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
    },
  }
}
