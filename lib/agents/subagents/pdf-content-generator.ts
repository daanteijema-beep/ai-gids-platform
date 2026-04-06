/**
 * PDF Content Generator
 * Drie producttypen met echte meerwaarde:
 *   - swipe_file  → 25-40 kant-en-klare teksten/templates om te kopiëren
 *   - playbook    → herhaalbaar systeem van A tot Z met exacte stappen
 *   - toolkit     → prompts + templates + tooloverzicht gebundeld
 */
import Anthropic from '@anthropic-ai/sdk'
import { buildBrandedCover, buildTableOfContents, buildBrandedFooter, BRAND } from '../../brand'

const client = new Anthropic()

function stripJson(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.substring(start, end + 1)
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

// ─── HTML helpers ──────────────────────────────────────────────────────────────

function htmlSection(title: string, body: string): string {
  return `
<div style="padding:36px 48px;border-bottom:1px solid #f3f4f6;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
    <div style="width:3px;height:22px;background:${BRAND.colors.primary};border-radius:2px;"></div>
    <h2 style="font-size:19px;font-weight:700;color:${BRAND.colors.text};margin:0;">${title}</h2>
  </div>
  ${body}
</div>`
}

function htmlTemplate(label: string, text: string, index: number): string {
  const colors = ['#eef2ff', '#fef3c7', '#ecfdf5', '#fdf2f8', '#f0f9ff']
  const borders = [BRAND.colors.primary, BRAND.colors.accent, '#10b981', '#ec4899', '#0ea5e9']
  const bg = colors[index % colors.length]
  const border = borders[index % borders.length]
  return `
<div style="margin-bottom:16px;background:${bg};border-left:4px solid ${border};border-radius:0 10px 10px 0;padding:16px 20px;">
  <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${border};margin-bottom:8px;opacity:0.8;">${label}</div>
  <div style="font-size:14px;line-height:1.7;color:${BRAND.colors.text};white-space:pre-line;">${text}</div>
</div>`
}

function htmlStep(number: number, title: string, body: string, input?: string, output?: string, duration?: string): string {
  return `
<div style="margin-bottom:24px;background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
  <div style="background:${BRAND.colors.primaryDeep};color:white;padding:14px 20px;display:flex;align-items:center;gap:12px;">
    <div style="width:28px;height:28px;background:${BRAND.colors.accent};color:${BRAND.colors.primaryDeep};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;">${number}</div>
    <span style="font-size:15px;font-weight:700;">${title}</span>
    ${duration ? `<span style="margin-left:auto;font-size:11px;opacity:0.6;background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:10px;">${duration}</span>` : ''}
  </div>
  <div style="padding:16px 20px;">
    <p style="font-size:14px;line-height:1.7;color:${BRAND.colors.text};margin:0 0 12px;">${body}</p>
    ${input ? `<div style="background:#eef2ff;border-radius:8px;padding:10px 14px;margin-bottom:8px;"><span style="font-size:11px;font-weight:700;color:${BRAND.colors.primary};text-transform:uppercase;letter-spacing:1px;">Wat je invoert: </span><span style="font-size:13px;color:#374151;">${input}</span></div>` : ''}
    ${output ? `<div style="background:#ecfdf5;border-radius:8px;padding:10px 14px;"><span style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;">Wat je krijgt: </span><span style="font-size:13px;color:#374151;">${output}</span></div>` : ''}
  </div>
</div>`
}

function htmlPromptCard(title: string, prompt: string, useCase: string, index: number): string {
  return `
<div style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
  <div style="background:${BRAND.colors.primaryDeep};color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:13px;font-weight:700;">${index}. ${title}</span>
    <span style="font-size:11px;opacity:0.5;font-style:italic;">${useCase}</span>
  </div>
  <div style="padding:14px 16px;background:#1e1b4b08;">
    <div style="font-family:monospace;font-size:13px;line-height:1.7;color:#374151;background:white;padding:12px 14px;border-radius:8px;border:1px solid #e5e7eb;white-space:pre-wrap;">${prompt}</div>
    <div style="margin-top:8px;font-size:11px;color:${BRAND.colors.primary};font-weight:600;">→ Kopieer en plak in ChatGPT</div>
  </div>
</div>`
}

function htmlTool(name: string, description: string, url: string, price: string): string {
  return `
<div style="display:flex;align-items:flex-start;gap:14px;padding:14px;background:#f9fafb;border-radius:10px;margin-bottom:10px;border:1px solid #e5e7eb;">
  <div style="width:36px;height:36px;background:${BRAND.colors.primary};border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white;font-weight:800;font-size:14px;">${name[0]}</div>
  <div style="flex:1;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:14px;font-weight:700;color:${BRAND.colors.text};">${name}</span>
      <span style="font-size:12px;background:${BRAND.colors.accentLight};color:#92400e;padding:2px 8px;border-radius:10px;font-weight:600;">${price}</span>
    </div>
    <p style="font-size:13px;color:${BRAND.colors.textMuted};margin:4px 0 0;line-height:1.5;">${description}</p>
    ${url ? `<a href="${url}" style="font-size:12px;color:${BRAND.colors.primary};text-decoration:none;font-weight:500;">${url}</a>` : ''}
  </div>
</div>`
}

// ─── Generators per producttype ────────────────────────────────────────────────

async function generateSwipeFile(opts: GenerateOpts): Promise<{ html: string; sectionTitles: string[] }> {
  const { title, subtitle, niche, doelgroep, probleem } = opts

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Je bent een expert copywriter. Maak een swipe file voor Nederlandse ZZP'ers die ze morgen al kunnen gebruiken. Elke tekst is kant-en-klaar — kopiëren, invullen, versturen.

Product: ${title}
Niche: ${niche}
Doelgroep: ${doelgroep}
Probleem dat dit oplost: ${probleem}

COPYWRITING PRINCIPES (pas toe op ELKE tekst):
- Voordelen > kenmerken: schrijf wat het de lezer oplevert, niet wat het "is"
- Specifiek > vaag: "binnen 48 uur" > "snel", "€150 korting" > "goedkoper"
- Klantentaal: gebruik woorden die ${niche} zelf gebruikt, geen jargon
- Actieve stem, directe toon — jij-vorm
- Jobs-to-be-done: elke tekst helpt met een concrete taak die ze nu handmatig doen
- Geen uitroeptekens, geen superlatieven ("beste", "geweldig") — vertrouwen door concreetheid

KWALITEITSEIS PER TEKST:
- Zo specifiek dat een andere niche hem NIET kan gebruiken
- Invulvelden duidelijk: [NAAM KLANT], [DATUM], [BEDRAG], [JOUW NAAM], etc.
- Realistisch en geloofwaardig — klinkt als een echte professional, niet als een template

STRUCTUUR (JSON, GEEN markdown):
{
  "intro": "1 zin die beschrijft wat iemand na deze swipe file kan die ze daarvoor niet konden",
  "sections": [
    {
      "title": "Actie-gerichte categorie (bijv. 'Nieuwe opdrachten binnenhalen')",
      "items": [
        {
          "label": "Precieze situatie (bijv. 'Eerste contact na netwerkevent — WhatsApp')",
          "text": "De VOLLEDIGE uitgeschreven tekst. Niet: 'schrijf hier een intro'. Wél: de echte tekst die ze copy-pasten. Met echte zinnen, echte toon, juiste lengte voor het kanaal."
        }
      ]
    }
  ],
  "usage_tips": ["Concrete tip hoe je de meeste waarde uit deze categorie haalt", "Tip 2"]
}

Maak PRECIES 4 categorieën, elk met 5-8 items. Totaal minimaal 25 volledig uitgeschreven teksten.
Maak elke tekst zo specifiek voor ${niche} dat hij nergens anders werkt.`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad swipe file response')
  const parsed = JSON.parse(stripJson(content.text))

  const sections: Array<{ title: string; items: Array<{ label: string; text: string }> }> = parsed.sections || []

  const introHtml = `
<div style="padding:32px 48px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-bottom:1px solid #c7d2fe;">
  <div style="max-width:600px;">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${BRAND.colors.primary};margin-bottom:10px;">Hoe gebruik je deze swipe file?</div>
    <p style="font-size:15px;line-height:1.7;color:${BRAND.colors.text};margin:0 0 16px;">${parsed.intro || ''}</p>
    ${(parsed.usage_tips || []).map((tip: string) => `
    <div style="display:flex;gap:10px;margin-bottom:8px;">
      <span style="color:${BRAND.colors.accent};font-weight:700;flex-shrink:0;">→</span>
      <span style="font-size:14px;color:#374151;">${tip}</span>
    </div>`).join('')}
  </div>
</div>`

  const sectionsHtml = sections.map(section => {
    const itemsHtml = (section.items || []).map((item, i) =>
      htmlTemplate(item.label, item.text, i)
    ).join('')
    return htmlSection(section.title, itemsHtml)
  }).join('')

  const totalItems = sections.reduce((sum, s) => sum + (s.items?.length || 0), 0)
  const coverSubtitle = subtitle || `${totalItems} kant-en-klare teksten voor ${niche}`
  const html = buildBrandedCover(title, coverSubtitle, niche)
    + buildTableOfContents(sections.map(s => s.title))
    + introHtml
    + sectionsHtml
    + buildBrandedFooter()

  return { html, sectionTitles: sections.map(s => s.title) }
}

async function generatePlaybook(opts: GenerateOpts): Promise<{ html: string; sectionTitles: string[] }> {
  const { title, subtitle, niche, doelgroep, probleem } = opts

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Je bent een expert in procesoptimalisatie voor ZZP'ers. Maak een playbook dat een herhaalbaar systeem geeft — zo concreet dat ze het zonder nadenken kunnen uitvoeren.

Product: ${title}
Niche: ${niche}
Doelgroep: ${doelgroep}
Probleem dat dit oplost: ${probleem}

KWALITEITSPRINCIPES:
- Jobs-to-be-done: elke fase = een concrete job die nu tijd kost
- Specifiek > vaag: "open ChatGPT en plak deze prompt" > "gebruik AI"
- Noem echte tools bij naam (ChatGPT, Notion, Moneybird, Exact, WhatsApp, Calendly, etc.)
- Elke stap heeft exact 1 actie — geen meerdere dingen in één stap
- Input/output model: wat stop je erin, wat komt eruit, hoe lang duurt het
- Tijdsbesparingen concreet maken: "van 45 min naar 8 min per offerte"
- Schrijf alsof een collega uitlegt hoe iets werkt — niet als een handleiding

VOOR ${niche} SPECIFIEK:
- Gebruik hun vakjargon en tools
- Baseer de tijdsinschatting op realistische situaties in hun branche
- De pijnpunten moeten direct herkenbaar zijn

STRUCTUUR (JSON, GEEN markdown):
{
  "intro": "Beschrijf de transformatie: van [situatie voor] naar [situatie na] in 2 zinnen",
  "promise": "Concrete belofte met getal: 'Na dit systeem kost [taak] je X minuten in plaats van Y uur'",
  "phases": [
    {
      "title": "Fase: [Naam] — [tijdsinvestering, bijv. 'eenmalig 20 min' of 'elke week 5 min']",
      "steps": [
        {
          "title": "Werkwoordzin als titel (bijv. 'Maak je standaard offerte template')",
          "description": "Exacte instructie: wat open je, wat typ je, waar klik je. Zo concreet dat iemand het in 1x goed doet.",
          "input": "Wat je nodig hebt of invult (tool, bestand, info)",
          "output": "Wat je hebt als deze stap klaar is",
          "duration": "X min"
        }
      ]
    }
  ],
  "checklist": ["Controleer: [concreet meetbaar resultaat]", "Controleer: item 2"],
  "time_saved": "Concreet: 'Dit bespaart je X uur per [week/maand] — dat is Y uur per jaar'"
}

Maak PRECIES 3 fases met elk 3-5 stappen. Minimaal 12 stappen totaal.
Elke stap moet zo concreet zijn dat iemand hem blind kan uitvoeren.`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad playbook response')
  const parsed = JSON.parse(stripJson(content.text))

  const phases: Array<{ title: string; steps: Array<{ title: string; description: string; input?: string; output?: string; duration?: string }> }> = parsed.phases || []

  const introHtml = `
<div style="padding:32px 48px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-bottom:1px solid #a7f3d0;">
  <div style="max-width:600px;">
    <p style="font-size:15px;line-height:1.7;color:${BRAND.colors.text};margin:0 0 14px;">${parsed.intro || ''}</p>
    <div style="background:white;border-left:4px solid #10b981;padding:14px 18px;border-radius:0 10px 10px 0;">
      <span style="font-size:13px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:1px;">Wat dit oplevert: </span>
      <span style="font-size:14px;color:#047857;">${parsed.promise || ''}</span>
    </div>
    ${parsed.time_saved ? `<div style="margin-top:14px;font-size:13px;color:#374151;"><span style="font-weight:700;">⏱ Tijdsbesparing:</span> ${parsed.time_saved}</div>` : ''}
  </div>
</div>`

  const phasesHtml = phases.map(phase => {
    const stepsHtml = (phase.steps || []).map((step, i) =>
      htmlStep(i + 1, step.title, step.description, step.input, step.output, step.duration)
    ).join('')
    return htmlSection(phase.title, stepsHtml)
  }).join('')

  const checklistHtml = parsed.checklist?.length ? `
<div style="padding:32px 48px;background:#f0fdf4;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
    <span style="font-size:18px;">✅</span>
    <h2 style="font-size:16px;font-weight:700;color:#065f46;margin:0;text-transform:uppercase;letter-spacing:1px;">Eindchecklist</h2>
  </div>
  ${(parsed.checklist as string[]).map(item => `
  <div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px dashed #d1fae5;">
    <span style="color:#10b981;font-weight:700;flex-shrink:0;">□</span>
    <span style="font-size:14px;color:#374151;">${item}</span>
  </div>`).join('')}
</div>` : ''

  const coverSubtitle = subtitle || `Het stap-voor-stap systeem voor ${niche}`
  const html = buildBrandedCover(title, coverSubtitle, niche)
    + buildTableOfContents(phases.map(p => p.title))
    + introHtml
    + phasesHtml
    + checklistHtml
    + buildBrandedFooter()

  return { html, sectionTitles: phases.map(p => p.title) }
}

async function generateToolkit(opts: GenerateOpts): Promise<{ html: string; sectionTitles: string[] }> {
  const { title, subtitle, niche, doelgroep, probleem } = opts

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Je bent een AI-expert die toolkits maakt voor Nederlandse ZZP'ers. Maak een toolkit die iemand na 1 uur al resultaat geeft — niet een lijst van tools, maar een compleet systeem dat meteen werkt.

Product: ${title}
Niche: ${niche}
Doelgroep: ${doelgroep}
Probleem dat dit oplost: ${probleem}

KWALITEITSPRINCIPES:
- Elke prompt is VOLLEDIG uitgeschreven en direct bruikbaar — geen "schrijf hier een prompt over X"
- Tools zijn gekozen op wat ${niche} écht gebruikt, niet wat hippe tech-mensen gebruiken
- Voordelen > functies: beschrijf wat de tool voor hen doet, niet wat het kan
- Specifiek > vaag: prompt resultaten beschrijven in concrete output ("je krijgt een offerte van 3 alinea's")
- Loss aversion: "zonder deze prompts doe je in 2 uur wat met AI in 10 minuten kan"
- Quick wins: iets wat ze TODAY al kunnen doen, zonder setup

PROMPT KWALITEITSEISEN:
- Elke prompt start met context-setting ("Jij bent een [rol]. Je helpt een [beroep] met [taak].")
- Variabelen in [HOOFDLETTERS] voor invulvelden
- Na de prompt: 1 zin wat je terugkrijgt als output
- Prompts zijn zo specifiek voor ${niche} dat ze ergens anders NIET werken

STRUCTUUR (JSON, GEEN markdown):
{
  "intro": "Transformatiebeschrijving: van [concreet probleem] naar [concreet resultaat] — met tijdsindicatie",
  "tools": [
    {
      "name": "Exacte tool naam",
      "description": "Wat het specifiek voor ${niche} doet — concreet voordeel, geen feature-lijst",
      "url": "https://exacte-url.com",
      "price": "Gratis / €X/maand / freemium tot X gebruikers"
    }
  ],
  "prompt_sections": [
    {
      "title": "Resultaatgerichte sectie (bijv. 'In 10 minuten een professionele offerte')",
      "prompts": [
        {
          "title": "Wat je bereikt met deze prompt",
          "use_case": "Exacte situatie: wanneer open je ChatGPT en gebruik je dit",
          "prompt": "De VOLLEDIGE prompt. Begin met context. Gebruik [INVULVELDEN]. Eindig met specifieke instructie voor de output. Minimaal 4 zinnen."
        }
      ]
    }
  ],
  "quick_wins": [
    "Vandaag in 5 min: open ChatGPT en doe [exacte actie] — je hebt dan [concreet resultaat]",
    "Quick win 2 even specifiek",
    "Quick win 3"
  ]
}

Maak:
- 4-6 tools (echt gebruikt door ${niche}, niet alleen voor tech-mensen)
- 3 prompt secties met elk 4-5 volledig uitgeschreven prompts
- Totaal minimaal 14 prompts
- 3 quick wins die vandaag al werken`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad toolkit response')
  const parsed = JSON.parse(stripJson(content.text))

  const promptSections: Array<{ title: string; prompts: Array<{ title: string; use_case: string; prompt: string }> }> = parsed.prompt_sections || []
  const tools: Array<{ name: string; description: string; url: string; price: string }> = parsed.tools || []

  const introHtml = `
<div style="padding:32px 48px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-bottom:1px solid #fcd34d;">
  <div style="max-width:600px;">
    <p style="font-size:15px;line-height:1.7;color:${BRAND.colors.text};margin:0 0 16px;">${parsed.intro || ''}</p>
    ${(parsed.quick_wins || []).map((win: string) => `
    <div style="display:flex;gap:10px;margin-bottom:8px;">
      <span style="color:${BRAND.colors.accent};font-weight:800;flex-shrink:0;">⚡</span>
      <span style="font-size:14px;color:#374151;">${win}</span>
    </div>`).join('')}
  </div>
</div>`

  const toolsHtml = htmlSection('Jouw AI Tool Stack', tools.map(t => htmlTool(t.name, t.description, t.url, t.price)).join(''))

  const promptsHtml = promptSections.map(section => {
    const promptsHtml = (section.prompts || []).map((p, i) =>
      htmlPromptCard(p.title, p.prompt, p.use_case, i + 1)
    ).join('')
    return htmlSection(section.title, promptsHtml)
  }).join('')

  const sectionTitles = ['Tool Stack', ...promptSections.map(s => s.title)]
  const coverSubtitle = subtitle || `Tools + prompts + templates voor ${niche}`
  const html = buildBrandedCover(title, coverSubtitle, niche)
    + buildTableOfContents(sectionTitles)
    + introHtml
    + toolsHtml
    + promptsHtml
    + buildBrandedFooter()

  return { html, sectionTitles }
}

// ─── Public API ────────────────────────────────────────────────────────────────

type GenerateOpts = {
  title: string
  subtitle?: string
  niche: string
  doelgroep: string
  probleem: string
  product_type?: 'swipe_file' | 'playbook' | 'toolkit'
}

export async function generatePdfContent(opts: GenerateOpts): Promise<{ html: string; chapterTitles: string[] }> {
  const productType = opts.product_type || 'swipe_file'

  let result: { html: string; sectionTitles: string[] }

  if (productType === 'playbook') {
    result = await generatePlaybook(opts)
  } else if (productType === 'toolkit') {
    result = await generateToolkit(opts)
  } else {
    result = await generateSwipeFile(opts)
  }

  return { html: result.html, chapterTitles: result.sectionTitles }
}
