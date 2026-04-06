/**
 * PDF Content Generator — professionele gids met brand template
 * Cover, inhoudsopgave, gestileerde hoofdstukken, footer.
 * Gebruikt max 5000 tokens zodat het binnen 60s draait op Vercel Hobby.
 */
import Anthropic from '@anthropic-ai/sdk'
import { buildBrandedCover, buildTableOfContents, buildChapter, buildBrandedFooter } from '../../brand'

const client = new Anthropic()

function stripJson(text: string) {
  const match = text.match(/\{[\s\S]*"intro"[\s\S]*"chapters"[\s\S]*\}/)
  if (match) return match[0]
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
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
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Schrijf een complete, praktische PDF gids voor Nederlandse ZZP'ers. Compact maar waardevol.

Product: ${title}
Niche: ${niche}
Doelgroep: ${doelgroep}
Probleem: ${probleem}

SCHRIJFSTIJL:
- Jij-vorm, direct en to-the-point
- Concrete tips met echte voorbeelden, cijfers en tools
- Geen fluff of vage adviezen
- Alsof je praat met een slimme collega die druk is

STRUCTUUR (geef terug als JSON, GEEN markdown blokken):
{
  "intro": "2 korte alinea's die het probleem benoemen en de belofte doen. Gescheiden door lege regel.",
  "chapters": [
    {
      "number": 1,
      "title": "Pakkende, concrete titel",
      "body": "3 alinea's met echte tips. Noem tools bij naam (ChatGPT, Notion, etc). Gescheiden door lege regel.",
      "actions": ["Vandaag: doe X in 10 min", "Deze week: stel Y in", "Binnen een maand: resultaat Z bereiken"]
    }
  ],
  "outro": "1-2 zinnen afsluiting met concrete volgende stap + motivatie."
}

Schrijf PRECIES 3 hoofdstukken van elk ~150 woorden. Kompakt, direct, actionable.`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad PDF response from Claude')

  let parsed: any
  try {
    parsed = JSON.parse(stripJson(content.text))
  } catch {
    // Try extracting JSON more aggressively
    const jsonStart = content.text.indexOf('{')
    const jsonEnd = content.text.lastIndexOf('}')
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      parsed = JSON.parse(content.text.substring(jsonStart, jsonEnd + 1))
    } else {
      throw new Error('Failed to parse PDF content JSON')
    }
  }

  const chapters: Array<{ number: number; title: string; body: string; actions: string[] }> =
    parsed.chapters || []

  // Build professional HTML
  const cover = buildBrandedCover(title, subtitle, niche)
  const toc = buildTableOfContents(chapters.map(c => c.title))

  const introHtml = `
<div style="padding:40px 48px;border-bottom:1px solid #f3f4f6;">
  <p style="font-size:17px;font-weight:600;color:#4f46e5;margin:0 0 16px;">Welkom bij jouw gids 👋</p>
  ${(parsed.intro || '').split('\n\n').filter((p: string) => p.trim()).map((p: string) =>
    `<p style="font-size:15px;line-height:1.8;color:#1f2937;margin:0 0 14px;">${p.trim()}</p>`
  ).join('')}
</div>`

  const chaptersHtml = chapters.map(ch =>
    buildChapter(ch.number, ch.title, ch.body, ch.actions)
  ).join('')

  const outroHtml = `
<div style="padding:40px 48px;background:linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);">
  <div style="text-align:center;max-width:480px;margin:0 auto;">
    <div style="font-size:32px;margin-bottom:16px;">🎯</div>
    <h2 style="font-size:20px;font-weight:700;color:#1e1b4b;margin:0 0 14px;">Wat nu?</h2>
    ${(parsed.outro || '').split('\n\n').filter((p: string) => p.trim()).map((p: string) =>
      `<p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 12px;">${p.trim()}</p>`
    ).join('')}
    <div style="margin-top:24px;padding:16px 24px;background:white;border-radius:12px;border:1px solid #e0e7ff;">
      <p style="font-size:13px;color:#6b7280;margin:0;">Meer gidsen: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'}" style="color:#4f46e5;font-weight:600;text-decoration:none;">PraktischAI.nl</a></p>
    </div>
  </div>
</div>`

  const footer = buildBrandedFooter()

  const html = `${cover}${toc}${introHtml}${chaptersHtml}${outroHtml}${footer}`

  return { html, chapterTitles: chapters.map(ch => ch.title) }
}
