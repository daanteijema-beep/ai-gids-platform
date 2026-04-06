/**
 * Lead Finder Agent
 * Zoekt per live PDF actief naar:
 *   - Relevante Nederlandse Facebook groepen / Instagram communities
 *   - Specifieke hashtags met hoge betrokkenheid
 *   - Outreach scripts om te gebruiken in die communities
 *
 * Slaat resultaten op in agent_learnings (outreach_strategy per pdf)
 * en in een aparte kolom in pdfs.
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../supabase'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

export async function runLeadFinderAgent(): Promise<{ pdfsProcessed: number; leadsFound: number }> {
  // Get all active PDFs
  const { data: activePdfs } = await supabaseAdmin
    .from('pdfs')
    .select('id, title, slug, pdf_ideas(niche, target_audience, problem_solved)')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(5) // process max 5 at a time

  if (!activePdfs?.length) return { pdfsProcessed: 0, leadsFound: 0 }

  let totalLeadsFound = 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'

  for (const pdf of activePdfs) {
    const niche = (pdf.pdf_ideas as any)?.niche || ''
    const doelgroep = (pdf.pdf_ideas as any)?.target_audience || ''
    const probleem = (pdf.pdf_ideas as any)?.problem_solved || ''
    const pdfUrl = `${appUrl}/${pdf.slug}`

    // Use web search to find communities
    const messages: Anthropic.MessageParam[] = [{
      role: 'user',
      content: `Zoek naar Nederlandse online communities waar we dit PDF product kunnen promoten.

Product: "${pdf.title}"
Niche: ${niche}
Doelgroep: ${doelgroep}
Probleem dat het oplost: ${probleem}
Link: ${pdfUrl}

OPDRACHT:
1. Zoek naar actieve Nederlandse Facebook groepen voor deze doelgroep
2. Zoek naar relevante Instagram hashtags (Nederlands, >10k posts, hoge engagement)
3. Zoek naar forums/communities (bijv. zzp.nl, ondernemersforum.nl, Reddit NL)
4. Schrijf voor elke community een specifiek outreach script

Geef antwoord in dit JSON formaat:
{
  "communities": [
    {
      "platform": "facebook",
      "name": "Naam van de groep",
      "url": "url als beschikbaar",
      "size": "geschat aantal leden",
      "why_relevant": "waarom perfect voor dit product",
      "outreach_script": "Ready-to-use post tekst voor deze specifieke groep (max 150 woorden, met link ${pdfUrl})"
    }
  ],
  "hashtags": ["#hashtag1", "#hashtag2"],
  "quick_win": "De meest concrete actie die vandaag gedaan kan worden om leads te genereren"
}`
    }]

    let finalText = ''
    let attempts = 0
    let currentMessages = [...messages]

    while (attempts < 6) {
      attempts++
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system: `Je bent een lead generation specialist voor Nederlandse ZZP-producten.
Zoek echte, actieve communities. Schrijf outreach scripts die niet als spam voelen — waardevol en relevant.`,
        tools: [{ type: 'web_search_20250305' as any, name: 'web_search', max_uses: 3 } as any],
        messages: currentMessages,
      })

      const textBlocks = response.content.filter(b => b.type === 'text')
      if (textBlocks.length > 0) {
        finalText = (textBlocks[textBlocks.length - 1] as Anthropic.TextBlock).text
      }

      if (response.stop_reason === 'end_turn') break

      if (response.stop_reason === 'tool_use') {
        currentMessages.push({ role: 'assistant', content: response.content })
        const toolResults: Anthropic.ToolResultBlockParam[] = response.content
          .filter(b => b.type === 'tool_use')
          .map(b => ({ type: 'tool_result' as const, tool_use_id: (b as Anthropic.ToolUseBlock).id, content: 'Search completed.' }))
        if (toolResults.length > 0) currentMessages.push({ role: 'user', content: toolResults })
      } else break
    }

    if (!finalText) continue

    try {
      const parsed = JSON.parse(stripJson(finalText))
      const communities = parsed.communities || []
      totalLeadsFound += communities.length

      // Store as outreach_strategy learning linked to this PDF
      await supabaseAdmin.from('agent_learnings').insert({
        learning_type: 'outreach_strategy',
        insight: `[Lead Finder] ${pdf.title}: ${communities.length} communities gevonden`,
        data_points: {
          pdf_id: pdf.id,
          source: 'lead_finder',
          communities,
          hashtags: parsed.hashtags || [],
          quick_win: parsed.quick_win || '',
          generated_at: new Date().toISOString(),
        },
      })
    } catch {
      // JSON parse failed, skip this PDF
    }
  }

  return { pdfsProcessed: activePdfs.length, leadsFound: totalLeadsFound }
}

/**
 * Run lead finder for a single specific PDF (called right after approval).
 * Also generates targeted outreach email content per community found.
 */
export async function runLeadFinderForPdf(pdfId: string): Promise<{ communitiesFound: number; outreachGenerated: number }> {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('id, title, slug, pdf_ideas(niche, target_audience, problem_solved)')
    .eq('id', pdfId)
    .single()

  if (!pdf) return { communitiesFound: 0, outreachGenerated: 0 }

  const niche = (pdf.pdf_ideas as any)?.niche || ''
  const doelgroep = (pdf.pdf_ideas as any)?.target_audience || ''
  const probleem = (pdf.pdf_ideas as any)?.problem_solved || ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'
  const pdfUrl = `${appUrl}/${pdf.slug}`

  const messages: Anthropic.MessageParam[] = [{
    role: 'user',
    content: `Zoek naar Nederlandse online communities voor dit PDF product en schrijf gerichte outreach.

Product: "${pdf.title}"
Niche: ${niche}
Doelgroep: ${doelgroep}
Probleem: ${probleem}
Link: ${pdfUrl}

OPDRACHT:
1. Zoek 3-5 actieve Nederlandse Facebook groepen of online communities voor deze doelgroep
2. Zoek relevante Instagram hashtags (>5k posts, hoge engagement)
3. Schrijf per community een specifiek, persoonlijk outreach bericht (geen spam-gevoel, geef echt waarde)
4. Schrijf ook een "quick win" — 1 concrete actie voor vandaag om leads te genereren

Geef antwoord als JSON (GEEN markdown):
{
  "communities": [
    {
      "platform": "facebook",
      "name": "Naam van de groep",
      "url": "url indien beschikbaar",
      "size": "geschat ledenaantal",
      "why_relevant": "waarom perfect voor dit product (1 zin)",
      "outreach_script": "Ready-to-use bericht voor deze community. Persoonlijk, waardevol, geen directe spam. Max 120 woorden. Sluit af met: Meer weten? ${pdfUrl}"
    }
  ],
  "hashtags": ["#hashtag1", "#hashtag2"],
  "quick_win": "Concrete actie die vandaag gedaan kan worden"
}`
  }]

  let finalText = ''
  let currentMessages = [...messages]
  let attempts = 0

  while (attempts < 6) {
    attempts++
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: `Je bent een lead generation specialist voor Nederlandse ZZP-producten. Zoek echte communities en schrijf outreach die echt helpt — niet als spam voelt.`,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search', max_uses: 3 } as any],
      messages: currentMessages,
    })

    const textBlocks = response.content.filter(b => b.type === 'text')
    if (textBlocks.length > 0) {
      finalText = (textBlocks[textBlocks.length - 1] as Anthropic.TextBlock).text
    }

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      currentMessages.push({ role: 'assistant', content: response.content })
      const toolResults: Anthropic.ToolResultBlockParam[] = response.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result' as const, tool_use_id: (b as Anthropic.ToolUseBlock).id, content: 'Search completed.' }))
      if (toolResults.length > 0) currentMessages.push({ role: 'user', content: toolResults })
    } else break
  }

  if (!finalText) return { communitiesFound: 0, outreachGenerated: 0 }

  try {
    const parsed = JSON.parse(stripJson(finalText))
    const communities = parsed.communities || []

    await supabaseAdmin.from('agent_learnings').insert({
      learning_type: 'outreach_strategy',
      insight: `[Lead Finder] ${pdf.title}: ${communities.length} communities gevonden`,
      data_points: {
        pdf_id: pdfId,
        source: 'lead_finder',
        communities,
        hashtags: parsed.hashtags || [],
        quick_win: parsed.quick_win || '',
        generated_at: new Date().toISOString(),
      },
    })

    return { communitiesFound: communities.length, outreachGenerated: communities.length }
  } catch {
    return { communitiesFound: 0, outreachGenerated: 0 }
  }
}
