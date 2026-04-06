export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function isAuthorized(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || ''
  const auth = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  return secret === process.env.CRON_SECRET || auth === process.env.CRON_SECRET
}

function strip(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

type Lead = {
  id: string
  bedrijfsnaam: string
  sector: string | null
  plaats: string | null
  website: string | null
  kwaliteit_score: number | null
  notitie: string | null
}

// ─── Eerdere outreach learnings ophalen ───────────────────────────────────────
async function haalOutreachLearnings(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('campaign_learnings')
    .select('wat_werkte, email_open_rate')
    .order('email_open_rate', { ascending: false })
    .limit(5)

  if (!data?.length) return ''
  return `\nBEWEZEN WERKTE (hoge open rates):\n${data.map(l => `- ${l.wat_werkte} (${l.email_open_rate}% open rate)`).join('\n')}`
}

// ─── Email schrijven per lead ──────────────────────────────────────────────────
// Elke email is gepersonaliseerd op:
// 1. Bedrijfsnaam + sector → specifieke aanhef
// 2. Pijnpunt → concreet benoemen in context van hun sector
// 3. Product → oplossing presenteren zonder te pushen
// 4. CTA → laagdrempelig (geen demo/koop, wel gesprek/video)
// Structuur gebaseerd op email-marketing skill: pain hook → amplify → oplossing → CTA.
async function schrijfEmail(
  lead: Lead,
  idee: Record<string, string>,
  emailStrategie: Record<string, unknown>,
  learnings: string
): Promise<{ onderwerp: string; mail_body: string }> {
  const sequentie = (emailStrategie?.sequentie as Array<Record<string, string>>) || []
  const dag1 = sequentie[0] || {}
  const cta = emailStrategie?.cta || 'een kort gesprek van 15 minuten'
  const toon = emailStrategie?.toon || 'informeel maar professioneel'

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Schrijf een gepersonaliseerde cold email voor dit specifieke bedrijf.

PRODUCT: ${idee.naam} — ${idee.tagline}
WAT HET DOET: ${idee.beschrijving}
PIJNPUNT: ${idee.pijnpunt}
PRIJS: ${idee.prijsindicatie}

LEAD: ${lead.bedrijfsnaam} (${lead.sector || 'ondernemer'}, ${lead.plaats || 'Nederland'})
Website aanwezig: ${lead.website ? 'ja' : 'nee'}
Kwaliteitsscore: ${lead.kwaliteit_score}/10

EMAIL STRUCTUUR (dag 1): haak = "${dag1.haak || ''}", structuur = "${dag1.structuur || 'pain hook'}"
TOON: ${toon}
CTA: ${cta}
${learnings}

Eisen:
- Max 5 zinnen body, jij-vorm
- Noem bedrijfsnaam in eerste zin
- Noem het pijnpunt specifiek voor hun sector
- Eindig met: lichte CTA (niet pusherig)
- Afsluiting: "Met vriendelijke groet, Daan | vakwebtwente.nl"

Geef JSON: { "onderwerp": "max 50 tekens, geen spam-woorden", "mail_body": "volledig uitgeschreven email" }
Alleen JSON.`,
    }],
  })

  try {
    return JSON.parse(strip((msg.content[0] as { text: string }).text))
  } catch {
    return {
      onderwerp: `Vraag voor ${lead.bedrijfsnaam}`,
      mail_body: `Hoi,\n\nIk zag jullie bedrijf en had een vraag over ${idee.naam}.\n\nMet vriendelijke groet, Daan | vakwebtwente.nl`,
    }
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { run_id } = await req.json()

  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .select('*, product_ideas!pipeline_runs_product_idea_id_fkey(*)')
    .eq('id', run_id)
    .single()

  const [{ data: marketingPlan }, { data: leads }] = await Promise.all([
    supabaseAdmin.from('marketing_plans').select('*').eq('run_id', run_id).single(),
    supabaseAdmin.from('pipeline_leads').select('*').eq('run_id', run_id).order('kwaliteit_score', { ascending: false }).limit(20),
  ])

  if (!run?.product_idea_id || !marketingPlan || !leads?.length) {
    return NextResponse.json({ error: 'Missende data of geen leads' }, { status: 400 })
  }

  const idee = run.product_ideas as Record<string, string>
  const emailStrategie = (marketingPlan.email_strategie as Record<string, unknown>) || {}
  const learnings = await haalOutreachLearnings()

  // Emails schrijven — top 15 leads (gesorteerd op score)
  const topLeads = (leads as Lead[]).slice(0, 15)
  const emails: Array<{ lead: Lead; onderwerp: string; mail_body: string }> = []

  // Sequentieel om rate limits te vermijden
  for (const lead of topLeads) {
    const email = await schrijfEmail(lead, idee, emailStrategie, learnings)
    emails.push({ lead, ...email })
  }

  const inserts = emails.map(({ lead, onderwerp, mail_body }) => ({
    run_id,
    lead_id: lead.id,
    product_idea_id: run.product_idea_id,
    aan_naam: lead.bedrijfsnaam,
    aan_bedrijf: lead.bedrijfsnaam,
    aan_email: lead.website ? `info@${new URL(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`).hostname.replace('www.', '')}` : null,
    onderwerp,
    mail_body,
    status: 'wacht_op_goedkeuring',
  }))

  const { error } = await supabaseAdmin.from('outreach_queue').insert(inserts)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('pipeline_runs')
    .update({ status: 'wacht_op_goedkeuring', huidige_stap: 6 })
    .eq('id', run_id)

  return NextResponse.json({ ok: true, emails: inserts.length })
}
