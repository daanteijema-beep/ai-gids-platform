import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../supabase'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

export async function runTemplateAgent(pdfId: string) {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience, problem_solved, form_fields)')
    .eq('id', pdfId)
    .single()

  if (!pdf) throw new Error('PDF not found')

  const niche = pdf.pdf_ideas?.niche || 'ondernemer'
  const doelgroep = pdf.pdf_ideas?.target_audience || 'kleine ondernemer'
  const formFields = pdf.form_fields || []

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Je bent een expert in het schrijven van gepersonaliseerde zakelijke gidsen voor Nederlandse kleine ondernemers.

Maak een herbruikbare PDF template voor dit product:
- Product: ${pdf.title}
- Niche: ${niche}
- Doelgroep: ${doelgroep}
- Klant beantwoordt deze vragen: ${formFields.map((f: {label: string; key: string}) => `"${f.label}" (key: ${f.key})`).join(', ')}

De template moet:
1. Een vaste structuur hebben met 5-7 hoofdstukken
2. Variabelen gebruiken die ingevuld worden met klantinput (bijv. {{bedrijfsnaam}}, {{sector}}, {{kanaal}})
3. Een tone-of-voice hebben die past bij ${niche}
4. Concrete, actiegericht zijn (geen generiek advies)

Antwoord ALLEEN in dit JSON formaat:
{
  "tone_of_voice": "direct en praktisch, spreek de lezer aan als vakman/vakvrouw, geen jargon",
  "chapters": [
    {
      "number": 1,
      "title": "Jouw situatie als {{sector}}",
      "description": "Analyse van de huidige situatie op basis van klantinput",
      "variables_used": ["sector", "current_channels"],
      "key_points": ["punt 1 die altijd terugkomt", "punt 2"]
    }
  ],
  "intro_template": "Beste {{customer_name}}, als {{sector}} in Nederland weet je dat...",
  "outro_template": "Succes met het implementeren van dit plan, {{customer_name}}. Bij vragen...",
  "variable_map": {
    "customer_name": "Naam van de klant",
    "sector": "Sector/beroep van de klant"
  }
}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad template response')
  const template = JSON.parse(stripJson(content.text))

  const { error } = await supabaseAdmin.from('pdf_templates').upsert({
    pdf_id: pdfId,
    niche,
    tone_of_voice: template.tone_of_voice,
    chapters: template.chapters,
    intro_template: template.intro_template,
    outro_template: template.outro_template,
    variable_map: template.variable_map,
  }, { onConflict: 'pdf_id' })

  if (error) throw error
  return { pdfId, chapters: template.chapters.length }
}
