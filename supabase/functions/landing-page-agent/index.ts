// Supabase Edge Function: landing-page-agent
// Deno runtime — 150s max.
// Schrijft SEO-copy (30x-seo-content-writer framework) + maakt Stripe product aan.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'
import Stripe from 'npm:stripe'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2025-03-31.basil' })

function strip(t: string) { return t.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim() }
function slugify(naam: string) { return naam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
function prijsNaarCents(s: string): number {
  const m = s.match(/(\d+)/); return m ? parseInt(m[1]) * 100 : 2900
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
    const { data: run } = await supabase.from('pipeline_runs').select('*, product_ideas!pipeline_runs_product_idea_id_fkey(*)').eq('id', run_id).single()
    const { data: marketingPlan } = await supabase.from('marketing_plans').select('*').eq('run_id', run_id).single()

    if (!run?.product_idea_id || !marketingPlan) {
      return new Response(JSON.stringify({ error: 'Missende data' }), { status: 400 })
    }

    const idee = run.product_ideas as Record<string, string>
    const icp = (marketingPlan.icp as Record<string, string>) || {}
    const keywords = (marketingPlan.zoekwoorden as Record<string, string[]>) || {}
    const positionering = (marketingPlan as Record<string, unknown>).positionering as string || ''

    const prompt = `Je bent een senior conversion copywriter en SEO-specialist.
Schrijf een volledige, publicatieklare landingspagina voor een AI-tool voor Nederlandse kleine ondernemers.
Gebruik de 30x-seo-content-writer aanpak: elke sectie heeft een specifiek doel in de funnel.

PRODUCT INPUT:
Naam: ${idee.naam}
Tagline: ${idee.tagline}
Beschrijving: ${idee.beschrijving}
Doelgroep: ${icp.functietitel || idee.doelgroep}
Pijnpunt: ${idee.pijnpunt}
Prijs: ${idee.prijsindicatie}
Positionering: ${positionering}
Kernboodschappen: ${(marketingPlan.key_messages as string[])?.join(' | ')}
Primaire zoekwoorden: ${keywords.primair?.join(', ')}
Long-tail zoekwoorden: ${keywords.long_tail?.join(', ')}

SCHRIJFREGELS (30x-seo-content-writer):
1. Hero headline: SPECIFIEK pijnpunt of gewenste uitkomst — geen generiek "bespaar tijd"
2. Hero subline: WIE het voor is + WAT het oplost — max 2 zinnen, bevat primair zoekwoord
3. Features: schrijf als UITKOMSTEN met getallen. "Offerte in 2 minuten" > "Offertetool"
4. Sociaal bewijs: realistisch (naam + sector + concreet resultaat + tijdsbesparing). Geen "geweldig product!"
5. FAQ: echte bezwaren (prijs, vertrouwen, techniek, tijd). Antwoorden overtuigend maar eerlijk.
6. CTA: actief, urgentie, max 5 woorden. "Start vandaag gratis" > "Aanmelden"
7. Meta title: bevat primair zoekwoord + USP, max 60 tekens
8. Meta description: zoekwoord + pijnpunt + oplossing + CTA, max 155 tekens

JSON (alleen JSON, klaar voor publicatie — geen [placeholders]):
{
  "hero_headline": "max 8 woorden, bevat pijnpunt of gewenste uitkomst",
  "hero_subline": "2 zinnen: voor wie + wat het oplost, max 25 woorden",
  "features": [
    { "icon": "passend emoji", "titel": "uitkomst in 3-4 woorden", "tekst": "concreet voordeel in 1 zin met getal of tijdsindicatie" },
    { "icon": "emoji", "titel": "...", "tekst": "..." },
    { "icon": "emoji", "titel": "...", "tekst": "..." }
  ],
  "voordelen": [
    "voordeel als actieve zin max 10 woorden",
    "voordeel 2", "voordeel 3", "voordeel 4", "voordeel 5"
  ],
  "sociaal_bewijs": {
    "citaat": "concreet: 'Ik bespaar nu 3 uur per week op...' — GEEN generieke lof",
    "naam": "voornaam + achternaam initiaal",
    "functie": "functietitel + sector"
  },
  "faq": [
    { "vraag": "echt bezwaar van doelgroep", "antwoord": "eerlijk, geruststellend, max 2 zinnen" },
    { "vraag": "bezwaar 2 (prijs of ROI)", "antwoord": "..." },
    { "vraag": "bezwaar 3 (techniek of vertrouwen)", "antwoord": "..." }
  ],
  "cta_tekst": "max 5 woorden, actief en urgentie",
  "meta_title": "max 60 tekens, bevat primair zoekwoord",
  "meta_description": "max 155 tekens, bevat zoekwoord + uitkomst + CTA"
}
Alleen JSON.`

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    let copy: Record<string, unknown>
    try { copy = JSON.parse(strip((msg.content[0] as {text:string}).text)) }
    catch { await markeerFout('Claude gaf geen geldige JSON terug'); return new Response(JSON.stringify({ error: 'Ongeldige JSON' }), { status: 500 }) }

    // Stripe product + price
    let stripeProductId: string | null = null
    let stripePriceId: string | null = null
    const prijsInCents = prijsNaarCents(idee.prijsindicatie || '29')

    try {
      const product = await stripe.products.create({
        name: idee.naam, description: idee.beschrijving,
        metadata: { run_id, doelgroep: idee.doelgroep },
      })
      const price = await stripe.prices.create({
        product: product.id, unit_amount: prijsInCents, currency: 'eur',
        ...(idee.prijsindicatie?.includes('maand') ? { recurring: { interval: 'month' } } : {}),
      })
      stripeProductId = product.id; stripePriceId = price.id
    } catch (e) { console.error('Stripe fout:', e) }

    const slug = slugify(idee.naam)
    const sociaalBewijs = typeof copy.sociaal_bewijs === 'object'
      ? copy.sociaal_bewijs : { citaat: copy.sociaal_bewijs, naam: '', functie: '' }

    const { error } = await supabase.from('landing_pages').insert({
      run_id, product_idea_id: run.product_idea_id, slug,
      hero_headline: copy.hero_headline, hero_subline: copy.hero_subline,
      features: copy.features, voordelen: copy.voordelen, sociaal_bewijs: sociaalBewijs,
      faq: copy.faq, cta_tekst: copy.cta_tekst,
      meta_title: copy.meta_title, meta_description: copy.meta_description,
      stripe_product_id: stripeProductId, stripe_price_id: stripePriceId,
      prijs_in_cents: prijsInCents, live: false,
    })

    if (error) { await markeerFout(`DB insert: ${error.message}`); return new Response(JSON.stringify({ error: error.message }), { status: 500 }) }

    await supabase.from('pipeline_runs').update({ status: 'wacht_op_goedkeuring', huidige_stap: 3 }).eq('id', run_id)
    return new Response(JSON.stringify({ ok: true, slug, stripe: !!stripeProductId }), { status: 200 })

  } catch (e) {
    const reden = e instanceof Error ? e.message : String(e)
    await markeerFout(`Agent crash: ${reden}`)
    return new Response(JSON.stringify({ error: reden }), { status: 500 })
  }
})
