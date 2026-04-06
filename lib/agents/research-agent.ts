import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin, AgentLearning } from '../supabase'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

function extractFinalJson(_messages: Anthropic.MessageParam[], finalText: string): string {
  const jsonMatch = finalText.match(/\{[\s\S]*"ideas"[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return stripJson(finalText)
}

export async function runResearchAgent() {
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

  const { data: existingIdeas } = await supabaseAdmin
    .from('pdf_ideas')
    .select('niche, title')
    .in('status', ['pending', 'approved', 'published'])
    .order('created_at', { ascending: false })
    .limit(30)

  const existingNiches = existingIdeas?.map(i => i.niche).join(', ') || 'geen'

  const systemPrompt = `Je bent een product researcher voor een Nederlands platform dat gepersonaliseerde AI-gidsen verkoopt (€9–€19).

DOELGROEP: Nederlandse ZZP'ers en kleine ondernemers die actief zijn op Instagram en Facebook. Mensen die:
- Reels en Stories bekijken over ondernemen, AI, productiviteit
- In Facebook groepen zitten voor hun vak (kappers, coaches, fotografen, etc.)
- Impulsaankopen doen van €9–€19 als de pijn groot genoeg is
- Geen tijd hebben voor lange cursussen — willen DIRECT resultaat

SUCCESFORMULE voor Meta-advertenties:
- Het product lost een CONCREET, HERKENBAAR pijnpunt op dat iemand vandaag ervaart
- De waarde is onmiddellijk duidelijk in 1 zin ("Stop 3 uur per week te verspillen aan offertes")
- Prijs voelt als een no-brainer (€9–€15 voor iets dat je €50+ bespaart)
- De klantvragen zijn simpel, max 5 minuten in te vullen

Gebruik web search voor ECHTE data — zoek wat nu trending is.`

  const userPrompt = `Doe research en stel 3 nieuwe PDF productideeën voor die SCOREN op Instagram en Facebook.

WAT WE AL HEBBEN (vermijd exact deze niches): ${existingNiches}

ORCHESTRATOR LEARNINGS:
${learningsSummary}

STAPPEN:
1. Zoek op welke Nederlandse ZZP-niches nu actief zijn op Instagram/Facebook/TikTok
2. Zoek naar pijnpunten die mensen in die niches posten ("ik ben zo moe van...", "iemand tips voor...")
3. Zoek naar welke AI-toepassingen relevant zijn voor die niches (nog niet mainstream)
4. Bedenk per idee: kun je dit als Reel verkopen in 15 seconden? Zo nee, verander het idee

IDEE CRITERIA:
- Concreet probleem dat NU speelt (niet abstract "AI leren")
- Niche smal genoeg dat mensen denken "dit is voor mij geschreven"
- Resultaat dat in 1 week merkbaar is
- Prijs €9–€15 (impulse buy bij het scrollen)
- Max 5 klantvragen, allemaal in 2 minuten te beantwoorden

Antwoord in dit JSON formaat:
{
  "research_summary": "wat je online vond in 2-3 zinnen",
  "ideas": [
    {
      "niche": "Korte niche naam (bijv. 'Fotograaf ZZP' of 'VA Virtual Assistant')",
      "title": "Pakkende titel die de pijn raakt (bijv. 'Stop met uren aan offertes')",
      "subtitle": "1 zin die de belofte maakt",
      "target_audience": "Wie precies — beroep, situatie, frustratie",
      "problem_solved": "Het concrete probleem dat dit oplost",
      "estimated_price": 12,
      "research_rationale": "Gevonden op [bron]: concrete data of quote die dit onderbouwt",
      "agent_confidence_score": 80,
      "meta_hook": "De eerste zin van een Instagram Reel die mensen stopt met scrollen",
      "form_fields": [
        {"key": "beroep", "label": "Wat doe je precies?", "type": "text", "placeholder": "bijv. portretfotograaf", "required": true},
        {"key": "grootste_tijdsverspilling", "label": "Waar verlies je nu de meeste tijd aan?", "type": "select", "options": ["Offertes schrijven", "Klanten opvolgen", "Social media", "Administratie", "Iets anders"], "required": true},
        {"key": "huidige_tools", "label": "Welke AI tools gebruik je al?", "type": "select", "options": ["Geen", "ChatGPT", "Andere tools"], "required": true},
        {"key": "doel", "label": "Wat wil je het liefst automatiseren?", "type": "textarea", "placeholder": "bijv. ik wil dat offertes zichzelf schrijven", "required": true},
        {"key": "uren_per_week", "label": "Hoeveel uur per week kost dit probleem je?", "type": "select", "options": ["<1 uur", "1-3 uur", "3-5 uur", ">5 uur"], "required": true}
      ]
    }
  ]
}`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }]
  let finalText = ''
  let attempts = 0
  let currentMessages = [...messages]

  while (attempts < 8) {
    attempts++
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 5000,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search', max_uses: 5 } as any],
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

  if (!finalText) throw new Error('Research agent produced no output')

  let parsed: any
  try {
    const raw = extractFinalJson(currentMessages, finalText)
    parsed = JSON.parse(raw)
  } catch (e) {
    // Try harder: find JSON array of ideas anywhere in the text
    const arrayMatch = finalText.match(/"ideas"\s*:\s*(\[[\s\S]*?\])/)?.[1]
    if (arrayMatch) {
      parsed = { ideas: JSON.parse(arrayMatch) }
    } else {
      console.error('Research JSON parse failed. Raw output:', finalText.substring(0, 500))
      throw new Error(`JSON parse failed: ${e}. Output preview: ${finalText.substring(0, 200)}`)
    }
  }

  if (!parsed.ideas || !Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
    throw new Error('Research agent returned no ideas array. Output: ' + finalText.substring(0, 200))
  }

  if (parsed.research_summary) {
    await supabaseAdmin.from('agent_learnings').insert({
      learning_type: 'general',
      insight: `[Research run] ${parsed.research_summary}`,
      data_points: { source: 'web_research', timestamp: new Date().toISOString() },
    }).catch(() => {}) // non-fatal
  }

  const insertedIds: string[] = []

  for (const idea of parsed.ideas) {
    const { data, error } = await supabaseAdmin
      .from('pdf_ideas')
      .insert({
        status: 'pending',
        niche: idea.niche || 'Algemeen',
        title: idea.title,
        subtitle: idea.subtitle || '',
        target_audience: idea.target_audience || '',
        problem_solved: idea.problem_solved || '',
        estimated_price: idea.estimated_price || 12,
        research_rationale: idea.research_rationale || '',
        agent_confidence_score: idea.agent_confidence_score || 70,
        form_fields: idea.form_fields || [],
      })
      .select('id')
      .single()

    if (error) {
      console.error('Insert idea error:', error.message, 'Idea:', idea.title)
      throw new Error(`DB insert failed for "${idea.title}": ${error.message}`)
    }
    insertedIds.push(data.id)
  }

  return { count: insertedIds.length, ids: insertedIds, researchSummary: parsed.research_summary || '' }
}
