'use client'

import Link from 'next/link'

type Agent = {
  stap: number
  id: string
  naam: string
  beschrijving: string
  details: string[]
  badge: string
  badgeColor: string
}

const PIPELINE_AGENTS: Agent[] = [
  {
    stap: 1,
    id: 'research-ideas',
    naam: 'Research Ideas',
    beschrijving: 'Zoekt actuele AI-tool ideeën voor kleine ondernemers op basis van live marktdata.',
    details: ['Reddit trends', 'ProductHunt scraping', 'Google Trends (Apify)', 'LinkedIn posts'],
    badge: 'Stap 1',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    stap: 2,
    id: 'marketing-plan',
    naam: 'Marketing Plan',
    beschrijving: 'Bouwt een volledig marketing blueprint: ICP, email sequentie en social strategie.',
    details: ['Ideaal klantprofiel (ICP)', '3-delige email sequentie', 'LinkedIn + Meta + Instagram plan', 'Zoekwoord strategie'],
    badge: 'Stap 2',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  {
    stap: 3,
    id: 'landing-page-agent',
    naam: 'Landing Page Agent',
    beschrijving: 'Schrijft volledige SEO-copy en maakt automatisch een Stripe product + prijs aan.',
    details: ['Hero headline + subline', '3 features + 5 voordelen', 'FAQ + sociaal bewijs', 'Stripe product aanmaken'],
    badge: 'Stap 3',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  },
  {
    stap: 4,
    id: 'content-creator',
    naam: 'Content Creator',
    beschrijving: 'Genereert 3 kant-en-klare social posts (LinkedIn, Meta, Instagram) met stockfoto\'s.',
    details: ['LinkedIn post (150-250 woorden)', 'Meta advertentie tekst', 'Instagram post + hashtags', 'Pexels stockfoto per platform'],
    badge: 'Stap 4',
    badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  },
  {
    stap: 5,
    id: 'lead-gen-pipeline',
    naam: 'Lead Gen Pipeline',
    beschrijving: 'Vindt 10–30 bedrijven via Google Maps die passen bij het ideaal klantprofiel.',
    details: ['Google Maps scraping (Apify)', 'ICP-matching score 1-10', 'Deduplicatie', 'Kwaliteitsranking'],
    badge: 'Stap 5',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  {
    stap: 6,
    id: 'outreach-writer',
    naam: 'Outreach Writer',
    beschrijving: 'Schrijft gepersonaliseerde cold emails per lead op basis van sector, naam en pijnpunt.',
    details: ['Gepersonaliseerde aanhef', 'Pain hook (dag 1 structuur)', 'Bedrijfsspecifieke copy', 'Klaar voor verzending'],
    badge: 'Stap 6',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
]

export default function AgentsPage() {
  return (
    <div className="p-8 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-[13px] font-medium text-slate-400 mb-1 uppercase tracking-wider">Automatisering</p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AI Agents</h1>
          <p className="text-slate-500 mt-1.5 text-[15px]">
            6 gespecialiseerde agents die samen de volledige pipeline uitvoeren — van marktonderzoek naar outreach.
          </p>
        </div>
        <Link
          href="/dashboard/pipeline"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-orange-500/25"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Start pipeline
        </Link>
      </div>

      {/* Pipeline flow indicator */}
      <div className="bg-slate-900 rounded-2xl p-5 mb-8">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {PIPELINE_AGENTS.map((agent, i) => (
            <div key={agent.id} className="flex items-center gap-1 shrink-0">
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                <span className="text-[11px] font-bold text-orange-500">{String(agent.stap).padStart(2, '0')}</span>
                <span className="text-[12px] font-medium text-slate-300">{agent.naam}</span>
              </div>
              {i < PIPELINE_AGENTS.length - 1 && (
                <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-[12px] mt-3">
          Elke agent wordt automatisch gestart na goedkeuring van de vorige stap. Ga naar{' '}
          <Link href="/dashboard/pipeline" className="text-orange-400 hover:text-orange-300 underline underline-offset-2">Pipeline</Link>
          {' '}om te starten.
        </p>
      </div>

      {/* Agent cards grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PIPELINE_AGENTS.map((agent) => (
          <div key={agent.id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all group">
            {/* Top bar */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                  <span className="text-orange-400 font-black text-xs">{String(agent.stap).padStart(2, '0')}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-[14px]">{agent.naam}</h3>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${agent.badgeColor}`}>
                {agent.badge}
              </span>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-slate-500 text-[13px] leading-relaxed mb-4">{agent.beschrijving}</p>

              {/* Details */}
              <div className="space-y-1.5">
                {agent.details.map((detail) => (
                  <div key={detail} className="flex items-center gap-2 text-[12px] text-slate-400">
                    <span className="w-1 h-1 bg-orange-400 rounded-full shrink-0" />
                    {detail}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Automatisch via pipeline</span>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                  Wacht op stap {agent.stap > 1 ? agent.stap - 1 : '—'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA bottom */}
      <div className="mt-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-[16px] mb-1">Klaar om de pipeline te starten?</h3>
          <p className="text-slate-400 text-[13px]">
            De AI voert alle 6 stappen uit. Jij keurt elke stap goed voordat de volgende begint.
          </p>
        </div>
        <Link
          href="/dashboard/pipeline"
          className="shrink-0 flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-orange-500/25 ml-6"
        >
          Start nu
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
