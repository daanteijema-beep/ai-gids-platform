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
    .select('*, product_ideas(*)')
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

  // Claude schrijft volledige landingspagina copy.
  // Features worden als concrete voordelen geschreven, niet als functielijst.
  // FAQ is gebaseerd op echte bezwaren van de doelgroep.
  // SEO: meta title max 60 tekens, description max 155 tekens.
  const prompt = `Je bent een conversion copywriter die landingspagina's schrijft voor AI-tools voor Nederlandse kleine ondernemers.

Product: ${idee.naam}
Tagline: ${idee.tagline}
Beschrijving: ${idee.beschrijving}
Doelgroep: ${icp.functietitel || idee.doelgroep}
Pijnpunt: ${idee.pijnpunt}
Prijs: ${idee.prijsindicatie}
Kernboodschappen: ${JSON.stringify(marketingPlan.key_messages)}
Primaire zoekwoorden: ${keywords.primair?.join(', ') || ''}

Schrijf volledige landingspagina copy als JSON:
{
  "hero_headline": "pakkende hoofdkop, max 8 woorden, bevat pijnpunt of uitkomst",
  "hero_subline": "2 zinnen: wat het doet en voor wie, max 20 woorden",
  "features": [
    { "icon": "emoji", "titel": "feature naam", "tekst": "concreet voordeel in 1 zin" },
    { "icon": "emoji", "titel": "...", "tekst": "..." },
    { "icon": "emoji", "titel": "...", "tekst": "..." }
  ],
  "voordelen": [
    "voordeel 1 als bullet (max 8 woorden)",
    "voordeel 2",
    "voordeel 3",
    "voordeel 4",
    "voordeel 5"
  ],
  "sociaal_bewijs": "fictief maar realistisch testimonial van een tevreden gebruiker",
  "faq": [
    { "vraag": "bezwaar 1 van de doelgroep", "antwoord": "geruststellend antwoord" },
    { "vraag": "bezwaar 2", "antwoord": "..." },
    { "vraag": "bezwaar 3", "antwoord": "..." }
  ],
  "cta_tekst": "actietekst voor de knop, max 5 woorden",
  "meta_title": "SEO paginatitel, max 60 tekens",
  "meta_description": "SEO omschrijving, max 155 tekens, bevat zoekwoord"
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

  const { error } = await supabaseAdmin.from('landing_pages').insert({
    run_id,
    product_idea_id: run.product_idea_id,
    slug,
    hero_headline: copy.hero_headline,
    hero_subline: copy.hero_subline,
    features: copy.features,
    voordelen: copy.voordelen,
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
