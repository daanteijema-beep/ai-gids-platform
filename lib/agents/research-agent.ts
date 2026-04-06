import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin, AgentLearning, FormField } from '../supabase'

const client = new Anthropic()

export async function runResearchAgent() {
  // Fetch recent learnings to inform the agent
  const { data: learnings } = await supabaseAdmin
    .from('agent_learnings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  const learningsSummary = learnings?.length
    ? learnings.map((l: AgentLearning) => `- [${l.learning_type}] ${l.insight}`).join('\n')
    : 'Nog geen learnings beschikbaar — dit is de eerste run.'

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `Je bent een PDF product researcher voor een Nederlands platform dat semi-gepersonaliseerde AI-gidsen verkoopt aan kleine ondernemers (€9-€27 per stuk).

Het concept: een klant koopt een PDF die hun specifieke situatie analyseert. Ze vullen op de landingspagina in wat hun situatie is (branche, kanalen die ze gebruiken, huidige klanten, etc.), en ontvangen een volledig gepersonaliseerde PDF met concrete AI-tips voor hun situatie.

Doelgroep: ZZP'ers en kleine bedrijven in Nederland (bouwers, kappers, installateurs, coaches, accountants, horeca, etc.)

Wat je hebt geleerd van eerdere PDFs:
${learningsSummary}

Genereer nu 3 nieuwe PDF productideeën. Per idee:
1. Kies een specifieke niche
2. Maak een pakkende title (zoals "5x meer klanten als elektricien via social media met AI")
3. Beschrijf het probleem dat het oplost
4. Bepaal doelgroep
5. Stel prijs voor (€9, €12, €15, €19, of €27)
6. Geef een confidence score (0-100) gebaseerd op marktgrootte en koopbereidheid
7. Definieer welke form fields de klant invult op de landingspagina (maximaal 5 vragen)

Antwoord ALLEEN in dit JSON formaat, geen extra tekst:
{
  "ideas": [
    {
      "niche": "elektricien",
      "title": "5x meer klanten als elektricien via social media met AI",
      "subtitle": "Een persoonlijk stappenplan voor jouw situatie",
      "target_audience": "ZZP elektriciens en kleine elektriciteitsbedrijven",
      "problem_solved": "Elektriciens krijgen nauwelijks klanten via social media en weten niet hoe AI ze daarbij kan helpen",
      "estimated_price": 15,
      "research_rationale": "Elektriciens zijn een grote niche in NL, hebben hoge uurtarieven (dus bereid te betalen), en social media is een pijnpunt",
      "agent_confidence_score": 78,
      "form_fields": [
        {
          "key": "current_channels",
          "label": "Welke social media gebruik je nu?",
          "type": "select",
          "options": ["Geen", "Alleen Facebook", "Instagram", "LinkedIn", "Facebook + Instagram"],
          "required": true
        },
        {
          "key": "current_clients_per_month",
          "label": "Hoeveel nieuwe klanten krijg je gemiddeld per maand?",
          "type": "number",
          "placeholder": "bijv. 3",
          "required": true
        },
        {
          "key": "biggest_challenge",
          "label": "Wat is jouw grootste uitdaging met klanten werven?",
          "type": "textarea",
          "placeholder": "bijv. Ik weet niet wat ik moet posten",
          "required": true
        },
        {
          "key": "time_available",
          "label": "Hoeveel tijd per week heb je voor marketing?",
          "type": "select",
          "options": ["Minder dan 1 uur", "1-2 uur", "2-5 uur", "Meer dan 5 uur"],
          "required": true
        }
      ]
    }
  ]
}`,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const raw = content.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(raw)

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

  return { count: insertedIds.length, ids: insertedIds }
}
