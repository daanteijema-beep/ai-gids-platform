/**
 * PDF Subagent
 * Verantwoordelijk voor: PDF template maken per niche (wordt later gepersonaliseerd per klant)
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../../supabase'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

export async function runPdfSubagent(pdfId: string): Promise<{ chapters: number }> {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience, problem_solved, form_fields)')
    .eq('id', pdfId)
    .single()

  if (!pdf) throw new Error('PDF not found')

  const niche = (pdf.pdf_ideas as any)?.niche || 'ondernemer'
  const doelgroep = (pdf.pdf_ideas as any)?.target_audience || 'kleine ondernemer'
  const formFields = pdf.form_fields || []

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Maak een herbruikbare PDF template voor gepersonaliseerde AI-gidsen.

Product: ${pdf.title}
Niche: ${niche}
Doelgroep: ${doelgroep}
Klant beantwoordt: ${formFields.map((f: any) => `"${f.label}" (key: ${f.key})`).join(', ')}

De template is de STRUCTUUR. Later wordt elke variabele vervangen door klantspecifieke content.
Variabelen noteer je als {{key}} — gebruik de form field keys van de klant.

Antwoord ALLEEN in dit JSON formaat:
{
  "tone_of_voice": "directe beschrijving van schrijfstijl voor deze niche",
  "chapters": [
    {
      "number": 1,
      "title": "Jouw situatie als {{sector}}",
      "description": "Persoonlijke analyse van de klant op basis van hun antwoorden",
      "variables_used": ["sector", "current_channels"],
      "word_count_target": 400,
      "key_points": [
        "altijd terugkomend punt 1 voor deze niche",
        "altijd terugkomend punt 2"
      ],
      "action_item": "Wat doet de klant NA dit hoofdstuk?"
    }
  ],
  "intro_template": "Beste {{customer_name}}, als {{sector}} in Nederland...",
  "outro_template": "Succes {{customer_name}}. Vragen? Stuur een mail naar...",
  "variable_map": {
    "customer_name": "Naam van de klant",
    "sector": "Beroep/sector van de klant"
  },
  "estimated_total_words": 2800
}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad template response')
  const template = JSON.parse(stripJson(content.text))

  await supabaseAdmin.from('pdf_templates').upsert({
    pdf_id: pdfId,
    niche,
    tone_of_voice: template.tone_of_voice,
    chapters: template.chapters,
    intro_template: template.intro_template,
    outro_template: template.outro_template,
    variable_map: template.variable_map,
  }, { onConflict: 'pdf_id' })

  return { chapters: template.chapters.length }
}
