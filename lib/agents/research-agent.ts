import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin, AgentLearning } from '../supabase'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

// Extract the final JSON from a multi-turn web search conversation
function extractFinalJson(_messages: Anthropic.MessageParam[], finalText: string): string {
  // Find last JSON block in the response
  const jsonMatch = finalText.match(/\{[\s\S]*"ideas"[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return stripJson(finalText)
}

export async function runResearchAgent() {
  // Load learnings from orchestrator
  const { data: learnings } = await supabaseAdmin
    .from('agent_learnings')
    .select('learning_type, insight')
    .order('created_at', { ascending: false })
    .limit(20)

  const learningsSummary = learnings?.length
    ? learnings.map((l: Pick<AgentLearning, 'learning_type' | 'insight'>) =>
        `- [${l.learning_type}] ${l.insight}`
      ).join('\n')
    : 'Nog geen learnings — eerste run.'

  // Load existing niches to avoid duplicates
  const { data: existingIdeas } = await supabaseAdmin
    .from('pdf_ideas')
    .select('niche, title')
    .in('status', ['pending', 'approved', 'published'])
    .order('created_at', { ascending: false })
    .limit(30)

  const existingNiches = existingIdeas?.map(i => i.niche).join(', ') || 'geen'

  const systemPrompt = `Je bent een PDF product researcher voor een Nederlands platform dat gepersonaliseerde AI-gidsen verkoopt aan kleine ondernemers (€9-€27).

Gebruik web search om ECHTE data te vinden:
- Zoek op Reddit (r/Netherlands, r/zzp, r/ondernemen) naar pijnpunten van Nederlandse ZZP'ers
- Zoek op Google naar trending AI-toepassingen voor Nederlandse vakgebieden
- Controleer forums en communities voor kleine ondernemers in NL
- Zoek naar welke AI-onderwerpen het meest gezocht worden door Nederlandse ondernemers

Gebaseerd op echte data die je vindt: genereer 3 PDF ideeën.`

  const userPrompt = `Doe research en stel 3 nieuwe PDF productideeën voor.

WAT WE AL HEBBEN (vermijd deze niches): ${existingNiches}

WAT DE ORCHESTRATOR HEEFT GELEERD:
${learningsSummary}

INSTRUCTIES:
1. Zoek eerst op het web naar trending pijnpunten van Nederlandse ZZP'ers en kleine bedrijven rond AI-gebruik
2. Zoek specifiek naar: welke beroepsgroepen zoeken op AI, wat zijn hun grootste problemen, welke communities zijn actief
3. Baseer je ideeën op wat je ECHT vindt, niet op aannames
4. Per idee: niche, pakkende title, doelgroep, probleem, prijs (€9/12/15/19/27), confidence score, en 4-5 klantvragen

Geef je uiteindelijke antwoord in dit JSON formaat:
{
  "research_summary": "wat je hebt gevonden online in 2-3 zinnen",
  "ideas": [
    {
      "niche": "...",
      "title": "...",
      "subtitle": "Een persoonlijk stappenplan voor jouw situatie",
      "target_audience": "...",
      "problem_solved": "...",
      "estimated_price": 15,
      "research_rationale": "gevonden op [bron]: ...",
      "agent_confidence_score": 75,
      "form_fields": [
        {"key": "sector", "label": "Wat is je beroep/sector?", "type": "text", "placeholder": "bijv. elektricien", "required": true},
        {"key": "current_channels", "label": "Welke social media gebruik je nu?", "type": "select", "options": ["Geen", "Facebook", "Instagram", "LinkedIn", "TikTok", "Meerdere"], "required": true},
        {"key": "biggest_challenge", "label": "Wat is je grootste uitdaging met klanten werven?", "type": "textarea", "placeholder": "bijv. ik weet niet wat ik moet posten", "required": true},
        {"key": "current_clients_month", "label": "Hoeveel nieuwe klanten per maand?", "type": "number", "placeholder": "bijv. 3", "required": true},
        {"key": "time_for_marketing", "label": "Hoeveel uur per week voor marketing?", "type": "select", "options": ["<1 uur", "1-2 uur", "2-5 uur", ">5 uur"], "required": true}
      ]
    }
  ]
}`

  // Use web_search tool for real research
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userPrompt }
  ]

  let finalText = ''
  let attempts = 0
  const maxAttempts = 8 // prevent infinite loops

  // Agentic loop: keep going until Claude stops using tools
  let currentMessages = [...messages]

  while (attempts < maxAttempts) {
    attempts++

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 5000,
      system: systemPrompt,
      tools: [
        {
          type: 'web_search_20250305' as any,
          name: 'web_search',
          max_uses: 5,
        } as any,
      ],
      messages: currentMessages,
    })

    // Collect text content
    const textBlocks = response.content.filter(b => b.type === 'text')
    if (textBlocks.length > 0) {
      finalText = (textBlocks[textBlocks.length - 1] as Anthropic.TextBlock).text
    }

    // If no more tool use, we're done
    if (response.stop_reason === 'end_turn') break

    // If tool use, add assistant response and continue
    if (response.stop_reason === 'tool_use') {
      currentMessages.push({ role: 'assistant', content: response.content })

      // Build tool results
      const toolResults: Anthropic.ToolResultBlockParam[] = response.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({
          type: 'tool_result' as const,
          tool_use_id: (b as Anthropic.ToolUseBlock).id,
          content: 'Search completed.',
        }))

      if (toolResults.length > 0) {
        currentMessages.push({ role: 'user', content: toolResults })
      }
    } else {
      break
    }
  }

  if (!finalText) throw new Error('Research agent produced no output')

  const raw = extractFinalJson(currentMessages, finalText)
  const parsed = JSON.parse(raw)

  // Save research summary as a learning
  if (parsed.research_summary) {
    await supabaseAdmin.from('agent_learnings').insert({
      learning_type: 'general',
      insight: `[Research run] ${parsed.research_summary}`,
      data_points: { source: 'web_research', timestamp: new Date().toISOString() },
    })
  }

  const insertedIds: string[] = []
  for (const idea of parsed.ideas) {
    const { data, error } = await supabaseAdmin
      .from('pdf_ideas')
      .insert({
        status: 'pending',
        niche: idea.niche,
        title: idea.title,
        subtitle: idea.subtitle,
        target_audience: idea.target_audience,
        problem_solved: idea.problem_solved,
        estimated_price: idea.estimated_price,
        research_rationale: idea.research_rationale,
        agent_confidence_score: idea.agent_confidence_score,
        form_fields: idea.form_fields,
      })
      .select('id')
      .single()

    if (error) throw error
    insertedIds.push(data.id)
  }

  return { count: insertedIds.length, ids: insertedIds, researchSummary: parsed.research_summary }
}
