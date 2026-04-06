// Supabase Edge Function: outreach-writer
// Deno runtime — 150s max. Schrijft gepersonaliseerde cold emails per lead.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

function strip(t: string) { return t.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim() }

type Lead = {
  id: string; bedrijfsnaam: string; sector: string | null;
  plaats: string | null; website: string | null; kwaliteit_score: number | null; notitie: string | null
}

async function haalOutreachLearnings(): Promise<string> {
  const { data } = await supabase.from('campaign_learnings')
    .select('wat_werkte, email_open_rate').order('email_open_rate', { ascending: false }).limit(5)
  if (!data?.length) return ''
  return `\nBEWEZEN WERKTE:\n${data.map((l: Record<string,unknown>) => `- ${l.wat_werkte} (${l.email_open_rate}% open rate)`).join('\n')}`
}

// Email schrijven per lead — parallel in batches van 5 voor snelheid
async function schrijfEmailBatch(
  leads: Lead[], idee: Record<string, string>,
  emailStrategie: Record<string, unknown>, learnings: string
): Promise<Array<{ index: number; onderwerp: string; mail_body: string }>> {
  const sequentie = (emailStrategie?.sequentie as Array<Record<string, string>>) || []
  const dag1 = sequentie[0] || {}
  const cta = emailStrategie?.cta || 'een kort gesprek van 15 minuten'
  const toon = emailStrategie?.toon || 'informeel maar professioneel'

  const promises = leads.map((lead, index) =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 700,
      messages: [{ role: 'user', content: `Schrijf een gepersonaliseerde cold email voor dit specifieke bedrijf.

PRODUCT: ${idee.naam} — ${idee.tagline}
WAT HET DOET: ${idee.beschrijving}
PIJNPUNT: ${idee.pijnpunt}
PRIJS: ${idee.prijsindicatie}

LEAD: ${lead.bedrijfsnaam} (${lead.sector || 'ondernemer'}, ${lead.plaats || 'Nederland'})
Website aanwezig: ${lead.website ? 'ja' : 'nee'}
Kwaliteitsscore: ${lead.kwaliteit_score}/10

EMAIL STRUCTUUR (dag 1):
- Haak: "${dag1.haak || 'Raak direct het pijnpunt'}"
- Structuur: ${dag1.structuur || 'pain hook → probleem beschrijven → oplossing → CTA'}
TOON: ${toon}
CTA: ${cta}
${learnings}

Eisen:
- Max 5 zinnen body, jij-vorm, persoonlijk
- Noem bedrijfsnaam concreet in eerste zin
- Benoem het pijnpunt specifiek voor hun sector (${lead.sector || 'hun branche'})
- Eindig met zachte CTA — niet pusherig, eerder nieuwsgierig maken
- Afsluiting: "Met vriendelijke groet, Daan | vakwebtwente.nl"
- Geen [plaatshouders] of generieke zinnen

JSON: { "onderwerp": "max 50 tekens, geen spam-woorden, persoonlijk", "mail_body": "volledig uitgeschreven email" }
Alleen JSON.` }],
    }).then(msg => {
      try {
        const result = JSON.parse(strip((msg.content[0] as {text:string}).text))
        return { index, onderwerp: result.onderwerp, mail_body: result.mail_body }
      } catch {
        return { index, onderwerp: `Vraag voor ${lead.bedrijfsnaam}`, mail_body: `Hoi,\n\nIk zag jullie bedrijf en dacht dat ${idee.naam} interessant voor jullie kan zijn.\n\nMet vriendelijke groet, Daan | vakwebtwente.nl` }
      }
    }).catch(() => ({ index, onderwerp: `Vraag voor ${lead.bedrijfsnaam}`, mail_body: `Hoi ${lead.bedrijfsnaam},\n\nMet vriendelijke groet, Daan | vakwebtwente.nl` }))
  )

  return Promise.all(promises)
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  if (auth !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { run_id } = await req.json()

  async function markeerFout(reden: string) {
    await supabase.from('pipeline_runs').update({ status: 'afgewezen', afgewezen_reden: reden }).eq('id', run_id)
  }

  try {
    const { data: run } = await supabase.from('pipeline_runs').select('*, product_ideas(*)').eq('id', run_id).single()
    const [{ data: marketingPlan }, { data: leads }] = await Promise.all([
      supabase.from('marketing_plans').select('*').eq('run_id', run_id).single(),
      supabase.from('pipeline_leads').select('*').eq('run_id', run_id).order('kwaliteit_score', { ascending: false }).limit(15),
    ])

    if (!run?.product_idea_id || !marketingPlan || !leads?.length) {
      return new Response(JSON.stringify({ error: 'Missende data of geen leads' }), { status: 400 })
    }

    const idee = run.product_ideas as Record<string, string>
    const emailStrategie = (marketingPlan.email_strategie as Record<string, unknown>) || {}
    const learnings = await haalOutreachLearnings()

    const topLeads = (leads as Lead[]).slice(0, 15)

    // Alle emails parallel — Supabase heeft genoeg tijd
    const emailResults = await schrijfEmailBatch(topLeads, idee, emailStrategie, learnings)

    const inserts = topLeads.map((lead, i) => {
      const email = emailResults.find(e => e.index === i) || { onderwerp: `Vraag voor ${lead.bedrijfsnaam}`, mail_body: '' }
      let aanEmail: string | null = null
      if (lead.website) {
        try {
          const url = lead.website.startsWith('http') ? lead.website : `https://${lead.website}`
          aanEmail = `info@${new URL(url).hostname.replace('www.', '')}`
        } catch { /* skip */ }
      }
      return {
        run_id, lead_id: lead.id, product_idea_id: run.product_idea_id,
        aan_naam: lead.bedrijfsnaam, aan_bedrijf: lead.bedrijfsnaam,
        aan_email: aanEmail,
        onderwerp: email.onderwerp, mail_body: email.mail_body,
        status: 'wacht_op_goedkeuring',
      }
    })

    const { error } = await supabase.from('outreach_queue').insert(inserts)
    if (error) { await markeerFout(`DB insert: ${error.message}`); return new Response(JSON.stringify({ error: error.message }), { status: 500 }) }

    await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 6 }).eq('id', run_id)
    return new Response(JSON.stringify({ ok: true, emails: inserts.length }), { status: 200 })

  } catch (e) {
    const reden = e instanceof Error ? e.message : String(e)
    await markeerFout(`Agent crash: ${reden}`)
    return new Response(JSON.stringify({ error: reden }), { status: 500 })
  }
})
