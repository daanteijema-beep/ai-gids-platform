export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isDashboardOrCronAuthorizedRequest } from '@/lib/request-auth'
import { Resend } from 'resend'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = new Resend(process.env.RESEND_API_KEY)

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

const TWENTSE_PLAATSEN = ['Enschede', 'Hengelo', 'Almelo', 'Oldenzaal', 'Borne', 'Haaksbergen', 'Losser', 'Rijssen', 'Wierden']

type ApifyMapResult = {
  title?: string
  address?: string
  website?: string
  phone?: string
  url?: string
}

async function zoekBedrijven(zoekterm: string, plaats: string) {
  const token = process.env.APIFY_TOKEN
  if (!token) {
    return [
      { naam: `${zoekterm.charAt(0).toUpperCase() + zoekterm.slice(1)}sbedrijf Voorbeeld`, adres: `Hoofdstraat 1, ${plaats}`, website: undefined, telefoon: undefined },
    ]
  }

  try {
    const query = `${zoekterm} ${plaats} Nederland`

    // Start Apify Google Maps scraper
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/compass~google-maps-scraper/runs?token=${token}&memory=512`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [query],
          maxCrawledPlacesPerSearch: 8,
          language: 'nl',
          countryCode: 'nl',
          includeWebResults: false,
        }),
      }
    )
    if (!startRes.ok) return []
    const run = await startRes.json()
    const runId = run?.data?.id
    if (!runId) return []

    // Poll up to 60s
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 10000))
      const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`)
      const pd = await poll.json()
      if (pd?.data?.status === 'SUCCEEDED') {
        const itemsRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=8`)
        const items: ApifyMapResult[] = await itemsRes.json()
        return items.map(p => ({
          naam: p.title || '',
          adres: p.address || '',
          website: p.website || undefined,
          telefoon: p.phone || undefined,
        })).filter(p => p.naam)
      }
      if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(pd?.data?.status)) break
    }
    return []
  } catch {
    return []
  }
}

async function beoordeelProspect(naam: string, zoekterm: string, website?: string) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Beoordeel of dit bedrijf een goede prospect is voor VakwebTwente (bouwt professionele websites + aanvraagflows voor vakbedrijven, €79–€149/maand).

Naam: ${naam}
Type: ${zoekterm}
Website: ${website || 'GEEN WEBSITE'}

Geef JSON:
{ "score": 0-10, "notitie": "korte uitleg", "mailen": true/false }

Score 10 = perfecte prospect (geen/slechte website). Alleen JSON.`,
    }],
  })
  try {
    return JSON.parse(stripJson((msg.content[0] as { text: string }).text))
  } catch {
    return { score: 5, notitie: 'Analyse mislukt', mailen: false }
  }
}

async function schrijfMail(naam: string, zoekterm: string, plaats: string) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Schrijf een korte persoonlijke outreach-mail namens VakwebTwente aan ${naam}, een ${zoekterm} in ${plaats}.

VakwebTwente bouwt professionele websites met slimme aanvraagflows voor vakbedrijven in Twente. Klanten vinden het bedrijf via Google en kunnen in 3 stappen een aanvraag sturen. €79–€149/maand, geen opstartkosten.

Eisen:
- Max 5 zinnen, jij-vorm, informeel maar professioneel
- Specifiek voor ${zoekterm} in ${plaats}
- Eindig met uitnodiging voor een gratis gesprek van 20 minuten
- Afsluiting: "Met vriendelijke groet, Daan van VakwebTwente | 06-00 000 000"

Alleen de mail-body (geen onderwerpregel).`,
    }],
  })
  return (msg.content[0] as { text: string }).text
}

export async function POST(req: NextRequest) {
  if (!isDashboardOrCronAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Haal een actieve niche op
  const { data: niches } = await supabaseAdmin.from('niches').select('*').eq('actief', true)
  if (!niches?.length) return NextResponse.json({ error: 'Geen actieve niches' }, { status: 400 })

  const niche = niches[Math.floor(Math.random() * niches.length)]
  const plaats = TWENTSE_PLAATSEN[Math.floor(Math.random() * TWENTSE_PLAATSEN.length)]
  const resultaten: Array<{ bedrijf: string; actie: string }> = []

  const bedrijven = await zoekBedrijven(niche.sector_zoekterm, plaats)

  for (const bedrijf of bedrijven) {
    // Skip als al bekend
    const { data: bestaand } = await supabaseAdmin
      .from('outreach_targets')
      .select('id')
      .eq('bedrijfsnaam', bedrijf.naam)
      .single()
    if (bestaand) continue

    const beoordeling = await beoordeelProspect(bedrijf.naam, niche.sector_zoekterm, bedrijf.website)

    const { data: target } = await supabaseAdmin
      .from('outreach_targets')
      .insert({
        bedrijfsnaam: bedrijf.naam,
        niche_id: niche.id,
        sector: niche.sector_zoekterm,
        plaats,
        website: bedrijf.website || null,
        telefoon: bedrijf.telefoon || null,
        website_score: beoordeling.score,
        agent_notitie: beoordeling.notitie,
        status: 'gevonden',
      })
      .select()
      .single()

    if (beoordeling.mailen && bedrijf.website) {
      try {
        const domein = new URL(bedrijf.website).hostname.replace('www.', '')
        const email = `info@${domein}`
        const mailBody = await schrijfMail(bedrijf.naam, niche.sector_zoekterm, plaats)

        await resend.emails.send({
          from: `Daan van VakwebTwente <daan@vakwebtwente.nl>`,
          to: email,
          subject: `Meer aanvragen voor ${bedrijf.naam}?`,
          text: mailBody,
        })

        if (target) {
          await supabaseAdmin
            .from('outreach_targets')
            .update({ status: 'mail_verstuurd', email, mail_verstuurd_op: new Date().toISOString(), outreach_mail: mailBody })
            .eq('id', target.id)
        }

        resultaten.push({ bedrijf: bedrijf.naam, actie: `mail verstuurd naar ${email}` })
      } catch {
        resultaten.push({ bedrijf: bedrijf.naam, actie: `gevonden, geen mail (domein fout)` })
      }
    } else {
      resultaten.push({ bedrijf: bedrijf.naam, actie: `gevonden, score ${beoordeling.score} — niet gemaild` })
    }
  }

  return NextResponse.json({ niche: niche.naam, plaats, resultaten })
}

export const GET = POST
