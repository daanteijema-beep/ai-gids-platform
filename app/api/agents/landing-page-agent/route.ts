export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import Stripe from 'stripe'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-03-31.basil' })

function isAuthorized(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || ''
  const auth = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  return secret === process.env.CRON_SECRET || auth === process.env.CRON_SECRET
}

function strip(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

function slugify(naam: string) {
  return naam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function prijsNaarCents(prijsStr: string): number {
  const match = prijsStr.match(/(\d+)/)
  if (!match) return 2900
  return parseInt(match[1]) * 100
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { run_id } = await req.json()

  // Haal run + idee + marketing plan op
  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .select('*, product_ideas!pipeline_runs_product_idea_id_fkey(*)')
    .eq('id', run_id)
    .single()

  const { data: marketingPlan } = await supabaseAdmin
    .from('marketing_plans')
    .select('*')
    .eq('run_id', run_id)
    .single()

  if (!run?.product_idea_id || !marketingPlan) {
    return NextResponse.json({ error: 'Missende data' }, { status: 400 })
  }

  const idee = run.product_ideas as Record<string, string>
  const icp = (marketingPlan.icp as Record<string, string>) || {}
  const keywords = (marketingPlan.zoekwoorden as Record<string, string[]>) || {}

  // SEO-copy structuur gebaseerd op 30x-seo-content-writer framework:
  // Hero → Pain/Gain → Features als uitkomsten → Social proof → FAQ bezwaren → CTA
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
2. Hero subline: WIE het voor is + WAT het oplost — max 2 zinnen
3. Features: schrijf als UITKOMSTEN, niet als functies. "Offerte in 2 minuten" > "Offertetool"
4. Sociaal bewijs: realistisch (naam + sector + concreet resultaat). Geen "geweldig product!"
5. FAQ: echte bezwaren van deze doelgroep. Antwoorden overtuigend maar eerlijk.
6. CTA: actief, urgentie, max 5 woorden. "Start vandaag gratis" > "Aanmelden"
7. Meta title: bevat primair zoekwoord + USP, max 60 tekens
8. Meta description: bevat zoekwoord + pijnpunt + oplossing + CTA, max 155 tekens

JSON (alleen JSON, klaar voor publicatie — geen placeholders):
{
  "hero_headline": "max 8 woorden, bevat pijnpunt of gewenste uitkomst",
  "hero_subline": "2 zinnen: voor wie + wat het oplost, max 25 woorden",
  "features": [
    { "icon": "passend emoji", "titel": "uitkomst in 3-4 woorden", "tekst": "concreet voordeel in 1 zin met getal of tijdsindicatie" },
    { "icon": "emoji", "titel": "...", "tekst": "..." },
    { "icon": "emoji", "titel": "...", "tekst": "..." }
  ],
  "voordelen": [
    "voordeel als actieve zin, max 10 woorden",
    "voordeel 2",
    "voordeel 3",
    "voordeel 4",
    "voordeel 5"
  ],
  "sociaal_bewijs": {
    "citaat": "concreet resultaat: 'Ik bespaar nu 3 uur per week op...' — GEEN generieke lof",
    "naam": "voornaam + achternaam initiaal",
    "functie": "functietitel + sector"
  },
  "faq": [
    { "vraag": "echt bezwaar van doelgroep", "antwoord": "eerlijk, geruststellend, max 2 zinnen" },
    { "vraag": "bezwaar 2 (bijv. prijs of techniek)", "antwoord": "..." },
    { "vraag": "bezwaar 3 (bijv. tijd of vertrouwen)", "antwoord": "..." }
  ],
  "cta_tekst": "max 5 woorden, actief en urgentie",
  "meta_title": "max 60 tekens, bevat primair zoekwoord",
  "meta_description": "max 155 tekens, bevat zoekwoord + uitkomst + CTA"
}
Alleen JSON.`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  let copy: Record<string, unknown>
  try {
    copy = JSON.parse(strip((msg.content[0] as { text: string }).text))
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON van Claude' }, { status: 500 })
  }

  // Stripe product + price aanmaken
  let stripeProductId: string | null = null
  let stripePriceId: string | null = null
  const prijsInCents = prijsNaarCents(idee.prijsindicatie || '29')

  try {
    const product = await stripe.products.create({
      name: idee.naam,
      description: idee.beschrijving,
      metadata: { run_id, doelgroep: idee.doelgroep },
    })
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: prijsInCents,
      currency: 'eur',
      ...(idee.prijsindicatie?.includes('maand') ? { recurring: { interval: 'month' } } : {}),
    })
    stripeProductId = product.id
    stripePriceId = price.id
  } catch (e) {
    console.error('Stripe fout:', e)
    // Stripe fout stopt de pipeline niet — copy is al klaar
  }

  const slug = slugify(idee.naam)

  // sociaal_bewijs kan object of string zijn afhankelijk van Claude output
  const sociaalBewijs = typeof copy.sociaal_bewijs === 'object'
    ? copy.sociaal_bewijs
    : { citaat: copy.sociaal_bewijs, naam: '', functie: '' }

  const { error } = await supabaseAdmin.from('landing_pages').insert({
    run_id,
    product_idea_id: run.product_idea_id,
    slug,
    hero_headline: copy.hero_headline,
    hero_subline: copy.hero_subline,
    features: copy.features,
    voordelen: copy.voordelen,
    sociaal_bewijs: sociaalBewijs,
    faq: copy.faq,
    cta_tekst: copy.cta_tekst,
    meta_title: copy.meta_title,
    meta_description: copy.meta_description,
    stripe_product_id: stripeProductId,
    stripe_price_id: stripePriceId,
    prijs_in_cents: prijsInCents,
    live: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('pipeline_runs')
    .update({ status: 'wacht_op_goedkeuring', huidige_stap: 3 })
    .eq('id', run_id)

  return NextResponse.json({ ok: true, slug, stripe: !!stripeProductId })
}
