import { supabaseAdmin } from '@/lib/supabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import NicheLandingPage from './NicheLandingPage'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: niche } = await supabaseAdmin
    .from('niches')
    .select('naam, beschrijving')
    .eq('slug', slug)
    .single()

  if (!niche) return { title: 'VakwebTwente' }
  return {
    title: `${niche.naam} — Meer aanvragen via je website | VakwebTwente`,
    description: `VakwebTwente bouwt een professionele website met slimme aanvraagflow voor ${niche.naam} in Twente. Meer klanten, minder gemiste oproepen. Vanaf €79/maand.`,
  }
}

export default async function NichePage({ params }: Props) {
  const { slug } = await params

  const { data: niche } = await supabaseAdmin
    .from('niches')
    .select('*')
    .eq('slug', slug)
    .eq('actief', true)
    .single()

  if (!niche) notFound()

  // Haal gegenereerde landingspagina content op (als die bestaat)
  const { data: marketingContent } = await supabaseAdmin
    .from('marketing_content')
    .select('content')
    .eq('niche_id', niche.id)
    .eq('type', 'landing_page_copy')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

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
