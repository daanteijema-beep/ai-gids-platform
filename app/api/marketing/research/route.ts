import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { niche_id } = await req.json()

  // Haal niche op
  const { data: niche } = await supabaseAdmin
    .from('niches')
    .select('*')
    .eq('id', niche_id)
    .single()

  if (!niche) return NextResponse.json({ error: 'Niche niet gevonden' }, { status: 404 })

  // Haal bestaande leads + outreach data op voor context
  const [{ data: leads }, { data: outreach }, { data: bestaandeContent }] = await Promise.all([
    supabaseAdmin.from('leads').select('status, bron, created_at').eq('niche_id', niche_id).limit(50),
    supabaseAdmin.from('outreach_targets').select('status, website_score, agent_notitie').eq('niche_id', niche_id).limit(50),
    supabaseAdmin.from('marketing_content').select('type, status').eq('niche_id', niche_id),
  ])

  const leadStats = {
    totaal: leads?.length || 0,
    klanten: leads?.filter(l => l.status === 'klant').length || 0,
    via_aanvraag: leads?.filter(l => l.bron === 'aanvraagflow').length || 0,
  }
  const outreachStats = {
    totaal: outreach?.length || 0,
    gereageerd: outreach?.filter(o => o.status === 'gereageerd' || o.status === 'klant').length || 0,
    gemiddelde_score: outreach?.length
      ? Math.round(outreach.reduce((s, o) => s + (o.website_score || 5), 0) / outreach.length)
      : 0,
  }

  const prompt = `Je bent een senior marketing strategist gespecialiseerd in lokale B2B dienstverlening in Nederland.

Jij helpt VakwebTwente — een dienst die professionele websites met slimme aanvraagflows bouwt voor lokale vakbedrijven in Twente (€79–€149/maand).

## Niche: ${niche.naam} (${niche.sector_zoekterm})
## Huidige data:
- Leads: ${leadStats.totaal} totaal, ${leadStats.klanten} klanten, ${leadStats.via_aanvraag} via aanvraagflow
- Outreach: ${outreachStats.totaal} benaderd, ${outreachStats.gereageerd} reacties, gem. website-score ${outreachStats.gemiddelde_score}/10
- Gegenereerde content types: ${bestaandeContent?.map(c => c.type).join(', ') || 'geen'}

## Jouw opdracht:
Analyseer de situatie en geef een concreet marketing actieplan terug als JSON.

{
  "samenvatting": "2-3 zinnen over de huidige situatie en kansen",
  "beste_kanalen": [
    { "kanaal": "...", "prioriteit": "hoog/middel/laag", "reden": "...", "actie": "..." }
  ],
  "doelgroep_inzichten": [
    "...",
    "..."
  ],
  "aanbevolen_acties": [
    { "actie": "...", "tijdsinvestering": "...", "verwacht_resultaat": "..." }
  ],
  "content_gaps": ["types content die nog ontbreken maar waardevol zijn"],
  "quick_wins": ["3 dingen die deze week gedaan kunnen worden voor direct resultaat"]
}

Wees specifiek voor ${niche.naam} in de regio Twente. Alleen JSON.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { text: string }).text
  let analyse: unknown
  try {
    analyse = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim())
  } catch {
    analyse = { raw }
  }

  return NextResponse.json({ ok: true, niche: niche.naam, analyse })
}
