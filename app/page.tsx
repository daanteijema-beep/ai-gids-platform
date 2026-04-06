import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VakwebTwente — AI Automatisering voor het MKB',
  description: 'AI-gestuurde salesautomatisering voor het Nederlandse MKB. Van marktonderzoek naar gepersonaliseerde outreach — volledig automatisch.',
}

const PIPELINE_STAPPEN = [
  {
    nr: '01',
    naam: 'Marktonderzoek',
    tekst: 'AI analyseert Reddit, LinkedIn, Google Trends en ProductHunt om de beste kansen voor jouw business te vinden.',
    icon: '🔍',
  },
  {
    nr: '02',
    naam: 'Marketing Blueprint',
    tekst: 'Volledig ICP, email sequentie en social strategie — afgestemd op jouw doelgroep en actuele trends.',
    icon: '📋',
  },
  {
    nr: '03',
    naam: 'Landingspagina',
    tekst: 'SEO-geoptimaliseerde copy + automatisch een Stripe product aanmaken. Klaar voor lancering.',
    icon: '🌐',
  },
  {
    nr: '04',
    naam: 'Social Content',
    tekst: 'Kant-en-klare posts voor LinkedIn, Meta en Instagram, inclusief stockfoto\'s per platform.',
    icon: '📱',
  },
  {
    nr: '05',
    naam: 'Leads Vinden',
    tekst: 'AI vindt 10–30 bedrijven via Google Maps die perfect passen bij jouw ideaal klantprofiel.',
    icon: '🗺️',
  },
  {
    nr: '06',
    naam: 'Gepersonaliseerde Outreach',
    tekst: 'Cold emails per lead, geschreven op basis van sector, bedrijfsnaam en pijnpunt. Klaar voor verzending.',
    icon: '✉️',
  },
]

const STATS = [
  { getal: '6', label: 'AI agents in serie', sub: 'Volledig georkestreerd' },
  { getal: '< 30', label: 'minuten van start tot leads', sub: 'Op autopilot' },
  { getal: '100%', label: 'Nederlandse markt', sub: 'MKB-gefocust' },
]

const VOORDELEN = [
  {
    icon: '⚡',
    titel: 'Geen handmatig werk',
    tekst: 'Van marktonderzoek tot gepersonaliseerde outreach — de AI doet alles. Jij keurt goed.',
  },
  {
    icon: '🎯',
    titel: 'Elke stap onder controle',
    tekst: 'Na elke stap beslis jij of het door mag. Geen black box — volledige transparantie.',
  },
  {
    icon: '🧠',
    titel: 'Leert van elke campagne',
    tekst: 'Het systeem onthoudt wat werkt en wat niet. Elke pipeline is beter dan de vorige.',
  },
  {
    icon: '🇳🇱',
    titel: 'Nederlands MKB',
    tekst: 'Gebouwd voor de Nederlandse markt. Doelgroepen, zoekwoorden en copy — alles in het Nederlands.',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">

      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">V</span>
            </div>
            <span className="font-bold text-[17px] text-slate-900 tracking-tight">
              Vakweb<span className="text-orange-500">Twente</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-slate-500">
            <a href="#hoe-het-werkt" className="hover:text-slate-900 transition-colors">Hoe het werkt</a>
            <a href="#voordelen" className="hover:text-slate-900 transition-colors">Voordelen</a>
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Dashboard</Link>
          </nav>
          <Link
            href="/dashboard/pipeline"
            className="bg-orange-500 hover:bg-orange-400 text-white text-[13px] font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            Pipeline starten →
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-[#070C18] text-white relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />
        {/* Orange glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/8 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-28 md:py-36">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[12px] font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
              AI Automatisering voor het Nederlandse MKB
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
              Jouw AI salesteam,{' '}
              <span className="text-orange-500">op autopilot</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
              Van marktonderzoek naar gepersonaliseerde outreach — in 6 stappen volledig automatisch.
              Gebouwd voor het Nederlandse MKB.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/pipeline"
                className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-7 py-4 rounded-xl text-[15px] transition-colors shadow-xl shadow-orange-500/25"
              >
                Start gratis pipeline
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#hoe-het-werkt"
                className="inline-flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-7 py-4 rounded-xl text-[15px] transition-colors"
              >
                Hoe werkt het?
              </a>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-slate-800/80 bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 grid grid-cols-3 divide-x divide-slate-800">
            {STATS.map(({ getal, label, sub }) => (
              <div key={label} className="px-6 first:pl-0 last:pr-0 text-center md:text-left">
                <div className="text-2xl md:text-3xl font-bold text-white mb-0.5">{getal}</div>
                <div className="text-[13px] font-semibold text-slate-300">{label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOE HET WERKT */}
      <section id="hoe-het-werkt" className="py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-semibold text-orange-500 uppercase tracking-[0.15em] mb-3">De Pipeline</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">6 stappen. Volledig automatisch.</h2>
            <p className="text-slate-500 mt-3 text-[16px] max-w-xl mx-auto">
              Elke stap wordt door een gespecialiseerde AI agent uitgevoerd. Jij keurt goed en de volgende begint.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PIPELINE_STAPPEN.map(({ nr, naam, tekst, icon }) => (
              <div key={nr} className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                      <span className="text-orange-400 font-black text-[11px]">{nr}</span>
                    </div>
                    <span className="text-xl">{icon}</span>
                  </div>
                  {parseInt(nr) < 6 && (
                    <svg className="w-4 h-4 text-slate-200 group-hover:text-orange-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-[15px] mb-2">{naam}</h3>
                <p className="text-slate-500 text-[13px] leading-relaxed">{tekst}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/dashboard/pipeline"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-7 py-3.5 rounded-xl text-[14px] transition-colors"
            >
              Start jouw eerste pipeline
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* VOORDELEN */}
      <section id="voordelen" className="py-24 px-5 sm:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-semibold text-orange-500 uppercase tracking-[0.15em] mb-3">Waarom VakwebTwente</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Gebouwd voor ondernemers,<br />niet voor marketeers</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {VOORDELEN.map(({ icon, titel, tekst }) => (
              <div key={titel} className="bg-white rounded-2xl border border-slate-200 p-7 hover:border-slate-300 transition-colors">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="font-bold text-slate-900 text-[16px] mb-2">{titel}</h3>
                <p className="text-slate-500 text-[14px] leading-relaxed">{tekst}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-5 sm:px-8 bg-[#070C18] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-orange-500/6 rounded-full blur-3xl" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
            Klaar om jouw<br />
            <span className="text-orange-500">salesproces te automatiseren?</span>
          </h2>
          <p className="text-slate-400 text-[16px] mb-10 max-w-xl mx-auto leading-relaxed">
            Start vandaag je eerste AI pipeline. Geen technische kennis nodig — gewoon goedkeuren en laten draaien.
          </p>
          <Link
            href="/dashboard/pipeline"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-9 py-4 rounded-xl text-[16px] transition-colors shadow-2xl shadow-orange-500/30"
          >
            Pipeline starten
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-slate-600 text-[13px] mt-5">Inloggen vereist · Geen kosten · Direct live</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-5 sm:px-8 bg-slate-950 border-t border-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
              <span className="text-white font-black text-[10px]">V</span>
            </div>
            <span className="font-bold text-[15px] text-white tracking-tight">
              Vakweb<span className="text-orange-500">Twente</span>
            </span>
            <span className="text-slate-600 text-[13px] ml-1">— AI Automatisering voor het MKB</span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-slate-500">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/dashboard/pipeline" className="hover:text-white transition-colors">Pipeline</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
