'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Niche } from '@/lib/supabase'

type LandingCopy = {
  hero_headline?: string
  hero_subline?: string
  pijnpunten?: string[]
  voordelen?: { titel: string; tekst: string }[]
  sociale_bewijzen?: string[]
  faq?: { vraag: string; antwoord: string }[]
  cta_tekst?: string
} | null

type Props = { niche: Niche; landingCopy: LandingCopy }

const STAPPEN = [
  { nr: '01', titel: 'Gratis gesprek van 20 min', tekst: 'We bespreken jouw situatie, hoeveel aanvragen je nu mist en wat een goede aanvraagmachine voor jou oplevert.' },
  { nr: '02', titel: 'Website live binnen 5 werkdagen', tekst: 'Wij bouwen alles. Jij hoeft niks te doen. Professionele site, aanvraagflow, WhatsApp-melding — kant en klaar.' },
  { nr: '03', titel: 'Aanvragen komen automatisch', tekst: 'Klanten vinden jou via Google, doen een aanvraag in 3 stappen, en jij krijgt direct een melding met alle info.' },
]

export default function NicheLandingPage({ niche, landingCopy }: Props) {
  const [stap, setStap] = useState(1)
  const [formData, setFormData] = useState({ naam: '', telefoon: '', bedrijf: '', bericht: '' })
  const [verzonden, setVerzonden] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const heroHeadline = landingCopy?.hero_headline || `Meer aanvragen voor jouw ${niche.naam.toLowerCase().replace('s', '')}sbedrijf`
  const heroSubline = landingCopy?.hero_subline || `Een professionele website die 24/7 aanvragen binnenhaalt. Klanten vinden jou via Google, doen een aanvraag in 3 klikken, en jij krijgt direct een melding. Vanaf €${niche.prijs_basis}/maand, geen opstartkosten.`

  const pijnpunten = landingCopy?.pijnpunten || [
    `Je mist telefoontjes terwijl je aan het werk bent`,
    `Je hebt geen professionele website of die ziet er verouderd uit`,
    `Concurrenten scoren hoger op Google dan jij`,
    `Je besteedt tijd aan het uitleggen van wat je doet in plaats van werken`,
  ]

  const voordelen = landingCopy?.voordelen || [
    { titel: 'Website live in 5 werkdagen', tekst: 'Wij bouwen alles. Geen gedoe voor jou.' },
    { titel: '24/7 aanvragen ontvangen', tekst: 'Ook buiten kantooruren komen klanten bij je terecht.' },
    { titel: 'Direct WhatsApp-melding', tekst: 'Elke aanvraag direct op je telefoon.' },
    { titel: 'Google-vindbaarheid', tekst: 'We zorgen dat lokale klanten jou vinden.' },
  ]

  const faq = landingCopy?.faq || [
    { vraag: 'Hoe snel is mijn website live?', antwoord: 'Binnen 5 werkdagen na het eerste gesprek staat jouw website live.' },
    { vraag: 'Moet ik zelf iets doen?', antwoord: 'Nee. Wij verzorgen alles — ontwerp, tekst, techniek en Google-inrichting.' },
    { vraag: 'Kan ik opzeggen wanneer ik wil?', antwoord: 'Ja. Geen contract, gewoon maandelijks opzegbaar.' },
    { vraag: 'Wat kost het precies?', antwoord: `Basis is €${niche.prijs_basis}/maand (website + aanvraagformulier). Pro is €${niche.prijs_pro}/maand (inclusief slimme AI-aanvraagflow en WhatsApp-integratie). Geen eenmalige bouwkosten.` },
  ]

  async function verstuurAanvraag() {
    if (!formData.naam || !formData.telefoon) return
    setSubmitting(true)
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        naam: formData.naam,
        telefoon: formData.telefoon,
        bedrijf: formData.bedrijf,
        bericht: formData.bericht,
        niche_id: niche.id,
        bron: 'aanvraagflow',
        sector: niche.naam,
      }),
    })
    setSubmitting(false)
    setVerzonden(true)
  }

  return (
    <main className="min-h-screen bg-white">

      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-slate-900">
            Vakweb<span className="text-orange-500">Twente</span>
          </Link>
          <span className="text-slate-500 text-sm hidden md:block">{niche.icon} Specialist voor {niche.naam}</span>
          <a href="#aanvraag" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            Gratis gesprek →
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              {niche.icon} Specifiek voor {niche.naam} in Twente
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
              {heroHeadline}
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed mb-8">{heroSubline}</p>
            <div className="flex gap-3 flex-wrap">
              {['Geen opstartkosten', 'Live in 5 werkdagen', 'Maandelijks opzegbaar'].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-sm text-slate-300">
                  <span className="text-orange-400">✓</span> {f}
                </div>
              ))}
            </div>
          </div>

          {/* Aanvraagflow */}
          <div id="aanvraag" className="bg-white rounded-2xl p-6 text-slate-900 shadow-2xl">
            {verzonden ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold mb-2">Aanvraag ontvangen!</h3>
                <p className="text-slate-500 text-sm">We bellen je binnen 4 uur voor een gratis gesprek van 20 minuten.</p>
              </div>
            ) : (
              <>
                <h2 className="font-bold text-lg mb-1">Gratis gesprek aanvragen</h2>
                <p className="text-slate-500 text-sm mb-5">Binnen 4 uur gebeld. Geen verplichtingen.</p>

                {/* Stap 1 */}
                {stap === 1 && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Jouw naam *</label>
                      <input type="text" value={formData.naam} onChange={e => setFormData(p => ({ ...p, naam: e.target.value }))}
                        placeholder="bijv. Jan de Vries" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Telefoonnummer *</label>
                      <input type="tel" value={formData.telefoon} onChange={e => setFormData(p => ({ ...p, telefoon: e.target.value }))}
                        placeholder="06 12 34 56 78" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                    </div>
                    <button onClick={() => formData.naam && formData.telefoon && setStap(2)}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                      disabled={!formData.naam || !formData.telefoon}>
                      Volgende →
                    </button>
                  </div>
                )}

                {/* Stap 2 */}
                {stap === 2 && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Bedrijfsnaam</label>
                      <input type="text" value={formData.bedrijf} onChange={e => setFormData(p => ({ ...p, bedrijf: e.target.value }))}
                        placeholder={`bijv. ${niche.naam.slice(0, -1)}sbedrijf De Boer`} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Wat is je grootste uitdaging?</label>
                      <textarea value={formData.bericht} onChange={e => setFormData(p => ({ ...p, bericht: e.target.value }))}
                        placeholder="bijv. ik mis te veel telefoontjes, mijn site ziet er oud uit..."
                        rows={3} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                    </div>
                    <button onClick={verstuurAanvraag} disabled={submitting}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-lg transition">
                      {submitting ? 'Versturen...' : 'Gratis gesprek aanvragen →'}
                    </button>
                    <button onClick={() => setStap(1)} className="w-full text-slate-400 text-sm hover:text-slate-600 py-1">← Terug</button>
                  </div>
                )}

                <p className="text-center text-xs text-slate-400 mt-4">🔒 We bellen alleen jou — geen spam</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* PIJNPUNTEN */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Herken jij dit?</h2>
          <p className="text-center text-slate-500 mb-10">De meest gehoorde frustraties van {niche.naam.toLowerCase()}</p>
          <div className="grid md:grid-cols-2 gap-4">
            {pijnpunten.map((punt, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-5 border border-red-100">
                <span className="text-red-400 text-lg shrink-0">✗</span>
                <span className="text-slate-700 text-sm">{punt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOE HET WERKT */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-10">Zo werkt het</h2>
          <div className="space-y-6">
            {STAPPEN.map(({ nr, titel, tekst }) => (
              <div key={nr} className="flex gap-5 items-start">
                <div className="w-12 h-12 bg-orange-500 text-white font-bold rounded-xl flex items-center justify-center shrink-0 text-sm">{nr}</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{titel}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{tekst}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VOORDELEN */}
      <section className="py-16 px-6 bg-orange-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-10">Wat je krijgt</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {voordelen.map(({ titel, tekst }, i) => (
              <div key={i} className="flex gap-3 bg-white rounded-xl p-5 border border-orange-100">
                <span className="text-orange-500 text-lg shrink-0">✓</span>
                <div>
                  <div className="font-semibold text-slate-900 text-sm mb-0.5">{titel}</div>
                  <div className="text-slate-600 text-sm">{tekst}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIJZEN */}
      <section className="py-16 px-6 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Eerlijke prijzen voor {niche.naam.toLowerCase()}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left">
              <div className="text-slate-400 text-sm mb-1">Basis</div>
              <div className="text-3xl font-bold mb-1">€{niche.prijs_basis}<span className="text-slate-400 text-base font-normal">/maand</span></div>
              <ul className="space-y-2 text-sm text-slate-300 mt-4">
                {['Professionele website', 'Aanvraagformulier', 'WhatsApp-melding', 'Google Business inrichting', 'Hosting + SSL'].map(f => (
                  <li key={f} className="flex gap-2"><span className="text-orange-400">✓</span>{f}</li>
                ))}
              </ul>
            </div>
            <div className="bg-orange-500 rounded-2xl p-6 text-left relative">
              <div className="absolute -top-3 left-6 bg-white text-orange-600 text-xs font-bold px-3 py-1 rounded-full">Aanbevolen</div>
              <div className="text-orange-100 text-sm mb-1">Pro</div>
              <div className="text-3xl font-bold mb-1">€{niche.prijs_pro}<span className="text-orange-200 text-base font-normal">/maand</span></div>
              <ul className="space-y-2 text-sm text-white mt-4">
                {['Alles van Basis', 'Slimme AI-aanvraagflow', 'AI-assistent op je site', 'WhatsApp Business', 'Maandelijks rapport'].map(f => (
                  <li key={f} className="flex gap-2"><span>✓</span>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">Veelgestelde vragen</h2>
          <div className="space-y-3">
            {faq.map(({ vraag, antwoord }, i) => (
              <details key={i} className="border border-slate-200 rounded-xl p-5">
                <summary className="font-semibold text-slate-900 cursor-pointer list-none flex justify-between">
                  {vraag} <span className="text-slate-400 ml-4">+</span>
                </summary>
                <p className="text-slate-600 text-sm mt-3 leading-relaxed">{antwoord}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 px-6 bg-orange-500 text-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-3">{landingCopy?.cta_tekst || `Klaar voor meer aanvragen als ${niche.naam.toLowerCase().slice(0, -1)}?`}</h2>
          <p className="text-orange-100 mb-6">Plan een gratis gesprek. Binnen 4 uur gebeld. Geen verplichtingen.</p>
          <a href="#aanvraag" className="bg-white text-orange-600 font-bold px-8 py-4 rounded-xl hover:bg-orange-50 transition inline-block">
            Gratis gesprek aanvragen →
          </a>
        </div>
      </section>

      <footer className="py-8 px-6 bg-slate-900 text-slate-500 text-sm text-center">
        <Link href="/" className="font-bold text-white">Vakweb<span className="text-orange-500">Twente</span></Link>
        <span className="mx-3">·</span>
        <Link href="/privacy" className="hover:text-white">Privacy</Link>
        <span className="mx-3">·</span>
        <Link href="/contact" className="hover:text-white">Contact</Link>
      </footer>
    </main>
  )
}
