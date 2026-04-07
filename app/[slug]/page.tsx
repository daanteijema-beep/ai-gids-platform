import { supabaseAdmin } from '@/lib/supabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import NicheLandingPage from './NicheLandingPage'

type Props = { params: Promise<{ slug: string }> }

type NicheMetadata = {
  naam: string
  beschrijving: string | null
}

type NicheRecord = {
  id: string
  created_at: string
  naam: string
  slug: string
  sector_zoekterm: string
  beschrijving: string | null
  prijs_basis: number
  prijs_pro: number
  actief: boolean
  icon: string
  kleur: string
}

type LandingCopyRecord = {
  content: unknown
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const nicheResponse = await supabaseAdmin
    .from('niches')
    .select('naam, beschrijving')
    .eq('slug', slug)
    .single()
  const niche = nicheResponse.data as NicheMetadata | null

  if (!niche) return { title: 'VakwebTwente' }
  return {
    title: `${niche.naam} — Meer aanvragen via je website | VakwebTwente`,
    description: `VakwebTwente bouwt een professionele website met slimme aanvraagflow voor ${niche.naam} in Twente. Meer klanten, minder gemiste oproepen. Vanaf €79/maand.`,
  }
}

export default async function NichePage({ params }: Props) {
  const { slug } = await params

  const nicheResponse = await supabaseAdmin
    .from('niches')
    .select('*')
    .eq('slug', slug)
    .eq('actief', true)
    .single()
  const niche = nicheResponse.data as NicheRecord | null

  if (!niche) notFound()

  // Haal gegenereerde landingspagina content op (als die bestaat)
  const marketingContentResponse = await supabaseAdmin
    .from('marketing_content')
    .select('content')
    .eq('niche_id', niche.id)
    .eq('type', 'landing_page_copy')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  const marketingContent = marketingContentResponse.data as LandingCopyRecord | null

  const landingCopy = marketingContent?.content as {
    hero_headline?: string
    hero_subline?: string
    pijnpunten?: string[]
    voordelen?: { titel: string; tekst: string }[]
    sociale_bewijzen?: string[]
    faq?: { vraag: string; antwoord: string }[]
    cta_tekst?: string
  } | null

  return <NicheLandingPage niche={niche} landingCopy={landingCopy} />
}
