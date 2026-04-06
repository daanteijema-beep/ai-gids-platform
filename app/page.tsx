import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VakwebTwente — Meer aanvragen voor jouw vakbedrijf',
  description: 'Een professionele website met slimme aanvraagflow die 24/7 nieuwe klanten binnenhaalt. Voor loodgieters, installateurs, elektriciens en andere vakbedrijven in Twente.',
}

const NICHES = [
  { icon: '🔧', naam: 'Loodgieter', voorbeeld: '"Loodgieter nodig?" → direct aanvraag' },
  { icon: '⚡', naam: 'Installateur', voorbeeld: '"CV-ketel vervangen?" → offerte-aanvraag' },
  { icon: '💡', naam: 'Elektricien', voorbeeld: '"Groepenkast vervangen?" → afspraak inplannen' },
  { icon: '🎨', naam: 'Schilder', voorbeeld: '"Woning laten schilderen?" → gratis advies' },
  { icon: '🌱', naam: 'Hovenier', voorbeeld: '"Tuin laten aanleggen?" → inspectie aanvragen' },
  { icon: '🏠', naam: 'Dakdekker', voorbeeld: '"Dak laten inspecteren?" → gratis schouw' },
]

const RESULTATEN = [
  { getal: '3–8', label: 'nieuwe aanvragen per maand', icon: '📥' },
  { getal: '24/7', label: 'actief, ook buiten kantooruren', icon: '🕐' },
  { getal: '< 5 min', label: 'reactietijd op een aanvraag', icon: '⚡' },
  { getal: '€0', label: 'eenmalige investering — gewoon abonnement', icon: '💶' },
]

const STAPPEN = [
  {
    nr: '01',
    titel: 'Wij bouwen jouw aanvraagmachine',
    tekst: 'Professionele website + slimme aanvraagflow, specifiek voor jouw sector en regio. Klaar binnen 5 werkdagen.',
  },
  {
    nr: '02',
    titel: 'Klanten vinden jou via Google',
    tekst: 'We zorgen dat jouw bedrijf goed vindbaar is in Twente. Iemand zoekt "loodgieter Enschede" → zij landen op jouw site.',
  },
  {
    nr: '03',
    titel: 'Aanvragen komen automatisch binnen',
    tekst: 'De slimme flow vraagt precies wat jij nodig hebt om een offerte te maken. Jij krijgt een melding per WhatsApp en e-mail.',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">

      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-slate-900 tracking-tight">
            Vakweb<span className="text-orange-500">Twente</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#hoe-het-werkt" className="hover:text-slate-900 transition-colors">Hoe het werkt</Link>
            <Link href="/demo" className="hover:text-slate-900 transition-colors">Demo</Link>
            <Link href="/prijzen" className="hover:text-slate-900 transition-colors">Prijzen</Link>
          </nav>
          <Link
            href="/contact"
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Afspraak maken →
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            Voor vakbedrijven in Twente
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Meer klanten voor<br />
            <span className="text-orange-400">jouw vakbedrijf</span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Een website die 24/7 aanvragen binnenhaalt. Klanten vinden jou via Google,
            doen een aanvraag in 3 klikken, en jij krijgt direct een melding.
            Geen gedoe — gewoon meer werk.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Gratis gesprek aanvragen →
            </Link>
            <Link
              href="/demo"
              className="border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Bekijk een demo
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-6">Geen opstartkosten · Opzegbaar per maand · Binnen 5 werkdagen live</p>
        </div>
      </section>

      {/* RESULTATEN */}
      <section className="py-16 px-6 bg-orange-50 border-y border-orange-100">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {RESULTATEN.map(({ getal, label, icon }) => (
            <div key={label} className="text-center">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{getal}</div>
              <div className="text-sm text-slate-600">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* VOOR WIE */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Voor welk vakbedrijf?</h2>
            <p className="text-slate-500">We bouwen aanvraagmachines voor alle vakbedrijven in Twente en omgeving</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {NICHES.map(({ icon, naam, voorbeeld }) => (
              <div key={naam} className="border border-slate-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition group">
                <div className="text-3xl mb-3">{icon}</div>
                <div className="font-bold text-slate-900 mb-1">{naam}</div>
                <div className="text-xs text-slate-500 italic">{voorbeeld}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-6">
            Staat jouw sector er niet bij? Bel ons — we bouwen voor elk vakbedrijf.
          </p>
        </div>
      </section>

      {/* HOE HET WERKT */}
      <section id="hoe-het-werkt" className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Zo werkt het</h2>
            <p className="text-slate-500">Van nul naar meer aanvragen in 5 werkdagen</p>
          </div>
          <div className="space-y-8">
            {STAPPEN.map(({ nr, titel, tekst }) => (
              <div key={nr} className="flex gap-6 items-start">
                <div className="w-14 h-14 bg-orange-500 text-white font-bold text-lg rounded-2xl flex items-center justify-center shrink-0">
                  {nr}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{titel}</h3>
                  <p className="text-slate-600 leading-relaxed">{tekst}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WAT ZIT ERIN */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Wat krijg jij?</h2>
            <p className="text-slate-500">Alles wat je nodig hebt om online aanvragen te krijgen</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '🌐', titel: 'Professionele website', tekst: '5–7 pagina\'s, volledig op maat voor jouw vakbedrijf. Snel, mobiel-vriendelijk en professioneel.' },
              { icon: '📋', titel: 'Slimme aanvraagflow', tekst: 'Klanten doorlopen 3–4 stappen en geven jou exact de info die jij nodig hebt voor een offerte.' },
              { icon: '🔔', titel: 'Direct WhatsApp-melding', tekst: 'Elke aanvraag stuur je direct via WhatsApp én e-mail naar jou of je medewerker.' },
              { icon: '📍', titel: 'Google-vindbaarheid', tekst: 'We richten Google Business Profile in zodat klanten in jouw regio jou makkelijk vinden.' },
              { icon: '🤖', titel: 'AI-assistent op je site', tekst: 'Een slimme chat die vragen beantwoordt en bezoekers begeleidt naar een aanvraag.' },
              { icon: '📊', titel: 'Maandelijks rapport', tekst: 'Hoeveel aanvragen? Via welk kanaal? Je krijgt elke maand een helder overzicht.' },
            ].map(({ icon, titel, tekst }) => (
              <div key={titel} className="flex gap-4 p-6 border border-slate-200 rounded-xl hover:border-orange-200 transition">
                <div className="text-3xl shrink-0">{icon}</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{titel}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{tekst}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIJZEN PREVIEW */}
      <section className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Eerlijke prijzen, geen verborgen kosten</h2>
          <p className="text-slate-400 mb-10">Geen eenmalige bouw­kosten. Gewoon een vast maandbedrag, alles inbegrepen.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-left">
              <div className="text-slate-400 text-sm font-medium mb-2">Basis</div>
              <div className="text-4xl font-bold mb-1">€79<span className="text-lg text-slate-400 font-normal">/maand</span></div>
              <div className="text-slate-400 text-sm mb-6">Professionele website + aanvraagformulier</div>
              <ul className="space-y-2 text-sm text-slate-300">
                {['Professionele website', 'Aanvraagformulier', 'WhatsApp-melding', 'Google Business inrichting', 'Hosting + SSL'].map(f => (
                  <li key={f} className="flex gap-2"><span className="text-orange-400">✓</span>{f}</li>
                ))}
              </ul>
            </div>
            <div className="bg-orange-500 border border-orange-400 rounded-2xl p-8 text-left relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-orange-600 text-xs font-bold px-3 py-1 rounded-full">Meest gekozen</div>
              <div className="text-orange-100 text-sm font-medium mb-2">Pro</div>
              <div className="text-4xl font-bold mb-1">€149<span className="text-lg text-orange-100 font-normal">/maand</span></div>
              <div className="text-orange-100 text-sm mb-6">Alles + slimme AI-aanvraagflow</div>
              <ul className="space-y-2 text-sm text-white">
                {['Alles van Basis', 'Slimme 4-staps aanvraagflow', 'AI-assistent op je site', 'WhatsApp Business integratie', 'Reviews strategie', 'Maandelijks rapport'].map(f => (
                  <li key={f} className="flex gap-2"><span className="text-white/80">✓</span>{f}</li>
                ))}
              </ul>
            </div>
          </div>
          <Link href="/prijzen" className="inline-block mt-8 text-orange-400 hover:text-orange-300 text-sm font-medium">
            Bekijk alle details en vergelijk →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-orange-500 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Klaar voor meer aanvragen?</h2>
          <p className="text-orange-100 mb-8 text-lg">
            Plan een gratis kennismakingsgesprek van 20 minuten. We kijken samen of het bij jouw bedrijf past.
          </p>
          <Link
            href="/contact"
            className="bg-white text-orange-600 font-bold px-10 py-4 rounded-xl text-lg hover:bg-orange-50 transition inline-block"
          >
            Ja, ik wil meer aanvragen →
          </Link>
          <p className="text-orange-200 text-sm mt-4">Geen verplichtingen · Gratis gesprek · Antwoord binnen 4 uur</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-6 bg-slate-900 text-slate-500 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-4">
          <div>
            <span className="font-bold text-white">Vakweb<span className="text-orange-500">Twente</span></span>
            <p className="mt-1 text-slate-500">Aanvraagmachines voor Twentse vakbedrijven</p>
          </div>
          <div className="flex gap-6">
            <Link href="/demo" className="hover:text-white transition">Demo</Link>
            <Link href="/prijzen" className="hover:text-white transition">Prijzen</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
