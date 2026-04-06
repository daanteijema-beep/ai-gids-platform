import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin, AgentLearning } from '../supabase'

const client = new Anthropic()

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*"ideas"[\s\S]*\}/)
  if (match) return match[0]
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

export async function runResearchAgent() {
  const { data: learnings } = await supabaseAdmin
    .from('agent_learnings')
    .select('learning_type, insight')
    .order('created_at', { ascending: false })
    .limit(10)

  const learningsSummary = learnings?.length
    ? learnings.map((l: Pick<AgentLearning, 'learning_type' | 'insight'>) =>
        `- [${l.learning_type}] ${l.insight}`
      ).join('\n')
    : 'Eerste run.'

  const { data: existingIdeas } = await supabaseAdmin
    .from('pdf_ideas')
    .select('niche, title, product_type')
    .in('status', ['pending', 'approved', 'published'])
    .order('created_at', { ascending: false })
    .limit(20)

  const existingTitles = existingIdeas?.map(i => `"${i.title}" (${i.niche})`).join(', ') || 'geen'

  const systemPrompt = `Je bent een senior product researcher voor een Nederlands platform dat digitale toolkits, swipe files en playbooks verkoopt aan ZZP'ers (€12–€27).

JE DOEL: Vind producten die mensen ONMIDDELLIJK willen kopen als ze ze zien in hun feed — niet omdat ze slim zijn, maar omdat ze vandaag dat probleem hebben.

DOELGROEP: Nederlandse ZZP'ers en freelancers, 25-45 jaar:
- Kappers, coaches, fotografen, VA's, grafisch ontwerpers, copywriters, bouwvakkers, adviseurs
- Actief op Instagram, Facebook groepen (bijv. "ZZP Nederland", "Ondernemers NL")
- Kopen impulsief tussen €12–€27 als de pijn herkenbaar is
- Hebben GEEN tijd voor cursussen — willen iets wat ze morgen al kunnen gebruiken

PRODUCTTYPEN (kies het juiste type bij elk idee):

**swipe_file** — Kant-en-klare teksten, templates, scripts om direct te kopiëren.
Beste voor: communicatie (e-mails, berichten, offertes, social posts)
Voorbeeld: "40 copy-paste klantberichten voor fotografen" of "25 LinkedIn DM's die wél werken"
Prijs: €12–€17

**playbook** — Een herhaalbaar systeem/draaiboek van A tot Z met stap-voor-stap instructies.
Beste voor: processen die mensen keer op keer doen maar telkens opnieuw uitvinden
Voorbeeld: "Het onboarding systeem voor coaches — van intake tot eerste sessie" of "Zo factureer je 3x sneller"
Prijs: €17–€27

**toolkit** — Bundel van prompts + templates + tooloverzicht voor één specifiek resultaat.
Beste voor: nieuwe vaardigheden aanleren met direct resultaat (AI tools, marketing, etc.)
Voorbeeld: "De AI content toolkit voor kappers — 30 prompts + 10 post templates" of "ChatGPT voor coaches toolkit"
Prijs: €15–€22

ZOEKOPDRACHTEN OM TE DOEN:
1. Zoek naar actuele klachten van Nederlandse ZZP'ers: "ZZP" site:reddit.com/r/Netherlands OF zoek Facebook groep posts
2. Zoek wat er nu trending verkoopt op Etsy NL voor freelancers/ondernemers: "etsy.com templates netherlands freelancer"
3. Zoek naar specifieke beroepsgroep pijnpunten: bijv. "kapper ZZP klanten" of "fotograaf offerte probleem"
4. Zoek naar Nederlandse business forums of communities voor actuele discussies

CRITERIA VOOR EEN GOED IDEE:
- Heel specifiek beroep of situatie (niet "alle ondernemers")
- Probleem dat je in 5 woorden kunt omschrijven
- Iemand denkt "dit is precies voor mij gemaakt"
- Het product levert iets op wat ze anders ZELF moeten uitzoeken of maken
- Prijsvoelt als een no-brainer (oplost iets wat hen meer kost aan tijd)`

  const userPrompt = `Zoek online naar actuele pijnpunten van Nederlandse ZZP'ers en kom met 3 product ideeën.

WAT WE AL HEBBEN (maak iets anders): ${existingTitles}

LEARNINGS UIT EERDERE RUNS:
${learningsSummary}

AANPAK:
1. Doe eerst web searches om actuele data te vinden over Nederlandse ZZP pijnpunten
2. Kijk specifiek naar: Reddit NL, Facebook groepen, Trustpilot reviews van boekhoudsoftware, Etsy bestsellers
3. Kies dan voor elk idee bewust het juiste producttype (swipe_file / playbook / toolkit)
4. Maak ideeën zo specifiek mogelijk — niet "fotograaf" maar "newborn fotograaf" of "bruidsfotograaf"

Geef antwoord als JSON (GEEN markdown blokken):
{
  "research_summary": "wat je gevonden hebt in max 3 zinnen — concrete bronnen en trends",
  "ideas": [
    {
      "niche": "Beroep + context (bijv. 'Bruidsfotograaf ZZP')",
      "title": "Concrete, pakkende producttitel die het probleem én de oplossing bevat",
      "subtitle": "1 zin belofte — wat krijg je, wat levert het op",
      "target_audience": "Wie precies — beroep, fase, frustratie die ze herkennen",
      "problem_solved": "Het concrete probleem dat dit product oplost (1-2 zinnen)",
      "product_type": "swipe_file|playbook|toolkit",
      "estimated_price": 17,
      "research_rationale": "Concreet: gevonden op [bron], dit zeiden mensen: [quote of data]",
      "agent_confidence_score": 82,
      "meta_hook": "Eerste zin van een Instagram Reel die mensen laat stoppen met scrollen"
    }
  ]
}`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }]
  let finalText = ''
  let currentMessages = [...messages]
  let attempts = 0

  while (attempts < 10) {
    attempts++
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search', max_uses: 6 } as any],
      messages: currentMessages,
    })

    // Collect any text blocks
    const textBlocks = response.content.filter(b => b.type === 'text')
    if (textBlocks.length > 0) {
      finalText = (textBlocks[textBlocks.length - 1] as Anthropic.TextBlock).text
    }

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      // Push full response (includes actual search results as tool_result blocks)
      currentMessages.push({ role: 'assistant', content: response.content })
      // Ask Claude to continue with what it found
      currentMessages.push({ role: 'user', content: 'Ga door met de analyse op basis van je zoekresultaten.' })
    } else {
      break
    }
  }

  if (!finalText) throw new Error('Research agent produced no output')

  let parsed: any
  try {
    parsed = JSON.parse(extractJson(finalText))
  } catch {
    const arrayMatch = finalText.match(/"ideas"\s*:\s*(\[[\s\S]*?\])/)?.[1]
    if (arrayMatch) {
      parsed = { ideas: JSON.parse(arrayMatch) }
    } else {
      console.error('Research JSON parse failed. Output:', finalText.substring(0, 500))
      throw new Error('JSON parse failed. Output: ' + finalText.substring(0, 200))
    }
  }

  if (!parsed.ideas || !Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
    throw new Error('Research agent returned no ideas. Output: ' + finalText.substring(0, 200))
  }

  if (parsed.research_summary) {
    try {
      await supabaseAdmin.from('agent_learnings').insert({
        learning_type: 'general',
        insight: `[Research] ${parsed.research_summary}`,
        data_points: { source: 'web_research', timestamp: new Date().toISOString() },
      })
    } catch { /* non-fatal */ }
  }

  const insertedIds: string[] = []

  for (const idea of parsed.ideas) {
    const validProductType = ['swipe_file', 'playbook', 'toolkit'].includes(idea.product_type)
      ? idea.product_type
      : 'swipe_file'

    const { data, error } = await supabaseAdmin
      .from('pdf_ideas')
      .insert({
        status: 'pending',
        niche: idea.niche || 'Algemeen',
        title: idea.title,
        subtitle: idea.subtitle || '',
        target_audience: idea.target_audience || '',
        problem_solved: idea.problem_solved || '',
        product_type: validProductType,
        estimated_price: idea.estimated_price || 15,
        research_rationale: idea.research_rationale || '',
        agent_confidence_score: idea.agent_confidence_score || 70,
        meta_hook: idea.meta_hook || '',
        form_fields: [],
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
