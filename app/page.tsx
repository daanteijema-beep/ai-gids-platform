import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VakwebTwente — AI Tools voor het MKB',
  description: 'Wij bouwen AI tools voor kleine bedrijven in Nederland. Op maat, voor intern gebruik — zodat jij je focust op je vak.',
}

const DIENSTEN = [
  {
    icon: '🤖',
    titel: 'AI tools op maat',
    tekst: 'Wij bouwen een AI tool die past bij hoe jouw bedrijf werkt. Geen kant-en-klare software, maar iets wat jij écht gaat gebruiken.',
  },
  {
    icon: '⚙️',
    titel: 'Procesautomatisering',
    tekst: 'Herhalende taken zoals offertes maken, afspraken inplannen of documenten verwerken — de AI pakt het over.',
  },
  {
    icon: '💬',
    titel: 'AI klantenservice',
    tekst: 'Een AI-assistent die klantvragen beantwoordt, afspraken inplant en informatie opzoekt — ook buiten kantooruren.',
  },
  {
    icon: '📊',
    titel: 'Interne dashboards',
    tekst: 'Overzichtelijke tools die data uit jouw bedrijf samenbrengen en inzichten geven zonder dat je Excel hoeft te openen.',
  },
]

const STAPPEN = [
  {
    nr: '01',
    titel: 'Gratis gesprek',
    tekst: 'We kijken samen welke taken in jouw bedrijf de meeste tijd kosten. Geen verplichtingen — gewoon eerlijk advies.',
  },
  {
    nr: '02',
    titel: 'Wij bouwen het',
    tekst: 'We bouwen de AI tool specifiek voor jouw werkwijze. Snel, praktisch en zonder gedoe — jij hoeft niks technisch te doen.',
  },
  {
    nr: '03',
    titel: 'Jij gebruikt het',
    tekst: 'De tool is van jou, voor intern gebruik. We zorgen dat het werkt en passen het aan als jouw bedrijf groeit.',
  },
]

const STATS = [
  { getal: '80%', label: 'minder herhalend werk', sub: 'gemiddeld bij onze klanten' },
  { getal: '2 wkn', label: 'van gesprek naar live', sub: 'snelle oplevering' },
  { getal: '100%', label: 'maatwerk', sub: 'geen standaard software' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">

      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
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
            <a href="#diensten" className="hover:text-slate-900 transition-colors">Diensten</a>
            <a href="#aanpak" className="hover:text-slate-900 transition-colors">Aanpak</a>
            <a href="#contact" className="hover:text-slate-900 transition-colors">Contact</a>
          </nav>
          <a
            href="#contact"
            className="bg-orange-500 hover:bg-orange-400 text-white text-[13px] font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            Gratis gesprek →
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-[#070C18] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-orange-500/8 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-28 md:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[12px] font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
              AI Automatisering voor het Nederlandse MKB
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-[68px] font-bold leading-[1.05] tracking-tight mb-6">
              Jouw eigen<br />
              AI tool.<br />
              <span className="text-orange-500">Op maat gebouwd.</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-xl leading-relaxed">
              Wij bouwen AI tools voor kleine bedrijven in Nederland — voor intern gebruik.
              Zodat jij je kunt focussen op je vak, terwijl de AI het herhalende werk doet.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-7 py-4 rounded-xl text-[15px] transition-colors shadow-xl shadow-orange-500/25"
              >
                Gratis intake gesprek
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="#diensten"
                className="inline-flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-7 py-4 rounded-xl text-[15px] transition-colors"
              >
                Bekijk onze diensten
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

      {/* DIENSTEN */}
      <section id="diensten" className="py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-semibold text-orange-500 uppercase tracking-[0.15em] mb-3">Wat wij doen</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">AI tools die echt werken voor jouw bedrijf</h2>
            <p className="text-slate-500 mt-3 text-[16px] max-w-xl mx-auto">
              Geen generieke software. We bouwen iets wat past bij hoe jij werkt — voor intern gebruik.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {DIENSTEN.map(({ icon, titel, tekst }) => (
              <div key={titel} className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all group">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="font-bold text-slate-900 text-[17px] mb-2">{titel}</h3>
                <p className="text-slate-500 text-[14px] leading-relaxed">{tekst}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AANPAK */}
      <section id="aanpak" className="py-24 px-5 sm:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-semibold text-orange-500 uppercase tracking-[0.15em] mb-3">Hoe het werkt</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Van gesprek naar live in 2 weken</h2>
          </div>

          <div className="space-y-5">
            {STAPPEN.map(({ nr, titel, tekst }) => (
              <div key={nr} className="flex gap-6 bg-white border border-slate-200 rounded-2xl p-7">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-orange-400 font-black text-[13px]">{nr}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-[16px] mb-2">{titel}</h3>
                  <p className="text-slate-500 text-[14px] leading-relaxed">{tekst}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / CONTACT */}
      <section id="contact" className="py-24 px-5 sm:px-8 bg-[#070C18] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-orange-500/6 rounded-full blur-3xl" />

        <div className="relative max-w-2xl mx-auto text-center">
          <p className="text-[12px] font-semibold text-orange-500 uppercase tracking-[0.15em] mb-4">Gratis gesprek</p>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
            Wil jij ook een<br />
            <span className="text-orange-500">AI tool op maat?</span>
          </h2>
          <p className="text-slate-400 text-[16px] mb-10 max-w-lg mx-auto leading-relaxed">
            Plan een gratis gesprek van 20 minuten. We kijken samen welke taak in jouw bedrijf klaar is voor automatisering.
          </p>

          <a
            href="mailto:info@vakwebtwente.nl"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-9 py-4 rounded-xl text-[16px] transition-colors shadow-2xl shadow-orange-500/30 mb-4"
          >
            Stuur een bericht
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <p className="text-slate-600 text-[13px]">Of bel direct · Geen verplichtingen · Antwoord binnen 24 uur</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-5 sm:px-8 bg-slate-950 border-t border-slate-900">
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
            <a href="#diensten" className="hover:text-white transition-colors">Diensten</a>
            <a href="#aanpak" className="hover:text-white transition-colors">Aanpak</a>
            <a href="mailto:info@vakwebtwente.nl" className="hover:text-white transition-colors">Contact</a>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
