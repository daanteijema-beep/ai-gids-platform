/**
 * Shared PDF content generator — used both at research time (for drafts)
 * and at approval time (if draft wasn't generated).
 *
 * Takes niche/product metadata and returns complete HTML + chapter titles.
 */
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

function textToHtml(text: string): string {
  return text.split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

function buildCoverHtml(title: string, subtitle: string): string {
  return `
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 64px 48px; min-height: 300px; display: flex; flex-direction: column; justify-content: space-between;">
    <div style="font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; opacity: 0.6;">AI GIDS</div>
    <div>
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.5; margin-bottom: 16px;">Persoonlijke Gids voor Nederlandse Ondernemers</div>
      <h1 style="font-size: 36px; font-weight: 800; margin: 0 0 16px; line-height: 1.2;">${title}</h1>
      ${subtitle ? `<p style="font-size: 18px; opacity: 0.85; margin: 0 0 24px;">${subtitle}</p>` : ''}
      <p style="font-size: 14px; opacity: 0.65; font-style: italic; margin: 0;">Samengesteld voor [NAAM]</p>
    </div>
    <div style="font-size: 12px; opacity: 0.4;">${new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}</div>
  </div>
  <div style="height: 32px; background: #f9fafb;"></div>`
}

export async function generatePdfContent(opts: {
  title: string
  subtitle?: string
  niche: string
  doelgroep: string
  probleem: string
}): Promise<{ html: string; chapterTitles: string[] }> {
  const { title, subtitle = '', niche, doelgroep, probleem } = opts

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 10000,
    messages: [{
      role: 'user',
      content: `Schrijf een complete, waardevolle PDF gids van ~3000 woorden voor Nederlandse ZZP'ers.

Product: ${title}
Niche: ${niche}
Doelgroep: ${doelgroep}
Probleem dat het oplost: ${probleem}

REGELS:
- Schrijf in jij-vorm, direct en praktisch
- Geen fluff — elke zin moet waarde toevoegen
- Concrete stappenplannen, voorbeelden, cijfers
- Schrijf echte adviezen die werken, niet algemeenheden

STRUCTUUR (geef terug als JSON, GEEN markdown blokken eromheen):
{
  "intro": "2-3 alinea's (gescheiden door lege regel), stel het probleem concreet en benoem wat de lezer na deze gids kan",
  "chapters": [
    {
      "number": 1,
      "title": "Pakkende hoofdstuktitel",
      "body": "3-4 alinea's met echte tips en uitleg (gescheiden door lege regel). Schrijf specifiek en concreet.",
      "actions": ["Concrete actie die je deze week kunt doen", "Actie 2", "Actie 3"]
    }
  ],
  "outro": "1-2 alinea's, motiverende afsluiting met concrete volgende stap"
}

Schrijf 5 hoofdstukken van elk ~400 woorden. Totaal: ~2500-3000 woorden.`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad PDF response')

  const parsed = JSON.parse(stripJson(content.text))
  const chapters: Array<{ number: number; title: string; body: string; actions: string[] }> = parsed.chapters || []

  // Build cover
  const cover = buildCoverHtml(title, subtitle)

  // Build intro
  const introHtml = `
  <div style="padding: 40px 48px 32px; border-bottom: 1px solid #e5e7eb;">
    <p style="font-size: 18px; font-weight: 600; color: #4f46e5; margin: 0 0 16px;">Hoi [NAAM],</p>
    ${textToHtml(parsed.intro || '')}
  </div>`

  // Build chapters
  const chaptersHtml = chapters.map(ch => `
  <div style="padding: 40px 48px; border-bottom: 1px solid #f3f4f6;">
    <h2 style="color: #4f46e5; font-size: 22px; font-weight: 700; margin: 0 0 20px;">${ch.number}. ${ch.title}</h2>
    ${textToHtml(ch.body)}
    ${ch.actions.length > 0 ? `
    <div style="background: #f0f4ff; border-left: 4px solid #4f46e5; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-top: 24px;">
      <p style="font-weight: 700; font-size: 14px; color: #374151; margin: 0 0 10px;">✅ Dit doe jij deze week:</p>
      <ul style="margin: 0; padding-left: 20px;">
        ${ch.actions.map(a => `<li style="color: #374151; font-size: 14px; margin-bottom: 6px; line-height: 1.6;">${a}</li>`).join('')}
      </ul>
    </div>` : ''}
  </div>`).join('')

  // Build outro
  const outroHtml = `
  <div style="padding: 40px 48px; background: #f9fafb;">
    <h2 style="color: #374151; font-size: 20px; font-weight: 700; margin: 0 0 16px;">🎯 Wat nu?</h2>
    ${textToHtml(parsed.outro || '')}
  </div>`

  const html = `${cover}${introHtml}${chaptersHtml}${outroHtml}`
  const chapterTitles = chapters.map(ch => ch.title)

  return { html, chapterTitles }
}
