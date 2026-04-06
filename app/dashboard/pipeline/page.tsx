'use client'

import { useState, useEffect, useCallback } from 'react'

type Run = {
  id: string
  created_at: string
  huidige_stap: number
  status: 'running' | 'wacht_op_goedkeuring' | 'afgewezen' | 'voltooid'
  afgewezen_reden: string | null
  product_idea_id: string | null
}

type Idee = {
  id: string
  naam: string
  tagline: string
  beschrijving: string
  doelgroep: string
  pijnpunt: string
  type: string
  prijsindicatie: string
  validatiescore: number
  bronnen: Record<string, unknown>
}

type MarketingPlan = {
  icp: Record<string, string>
  email_strategie: { sequentie: Array<{ dag: number; onderwerp: string; haak: string }>; cta: string }
  key_messages: string[]
  social_plan: Record<string, unknown>
}

type LandingPage = { slug: string; hero_headline: string; cta_tekst: string; stripe_product_id: string | null }
type ContentPost = { id: string; platform: string; afbeelding_url: string; afbeelding_alt: string; tekst: string; hashtags: string[] }
type Lead = { id: string; bedrijfsnaam: string; sector: string; plaats: string; kwaliteit_score: number; notitie: string }
type OutreachEmail = { id: string; aan_bedrijf: string; onderwerp: string; mail_body: string; status: string }

const STAP_LABELS = ['', 'Research', 'Marketing', 'Landing Page', 'Content', 'Leads', 'Outreach']
const STAP_ICONS = ['', '🔍', '📊', '🌐', '📸', '👥', '✉️']

function StatusBadge({ status }: { status: Run['status'] }) {
  const styles: Record<string, string> = {
    running: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    wacht_op_goedkeuring: 'bg-blue-50 text-blue-700 border-blue-200',
    afgewezen: 'bg-red-50 text-red-700 border-red-200',
    voltooid: 'bg-green-50 text-green-700 border-green-200',
  }
  const labels: Record<string, string> = {
    running: '⚙️ Bezig...',
    wacht_op_goedkeuring: '👁 Wacht op goedkeuring',
    afgewezen: '❌ Afgewezen',
    voltooid: '✅ Voltooid',
  }
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${styles[status] || ''}`}>
      {labels[status] || status}
    </span>
  )
}

export default function PipelinePage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [actieveRun, setActieveRun] = useState<string | null>(null)
  const [stap1Data, setStap1Data] = useState<Record<string, Idee[]>>({})
  const [stap2Data, setStap2Data] = useState<Record<string, MarketingPlan>>({})
  const [stap3Data, setStap3Data] = useState<Record<string, LandingPage>>({})
  const [stap4Data, setStap4Data] = useState<Record<string, ContentPost[]>>({})
  const [stap5Data, setStap5Data] = useState<Record<string, Lead[]>>({})
  const [stap6Data, setStap6Data] = useState<Record<string, OutreachEmail[]>>({})
  const [bezig, setBezig] = useState(false)
  const [rejectReden, setRejectReden] = useState('')
  const [showReject, setShowReject] = useState<string | null>(null)
  const [gebruikerPrompt, setGebruikerPrompt] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)

  const laadRuns = useCallback(async () => {
    const res = await fetch('/api/pipeline/list')
    if (res.ok) setRuns(await res.json())
  }, [])

  useEffect(() => { laadRuns() }, [laadRuns])

  // Auto-refresh elke 8 seconden als er runs zijn die 'running' zijn
  useEffect(() => {
    const heeftRunning = runs.some(r => r.status === 'running')
    if (!heeftRunning) return
    const t = setInterval(laadRuns, 8000)
    return () => clearInterval(t)
  }, [runs, laadRuns])

  async function startRun() {
    setBezig(true)
    setShowPrompt(false)
    const res = await fetch('/api/pipeline/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notitie: gebruikerPrompt.trim() || undefined }),
    })
    if (res.ok) {
      const { run_id } = await res.json()
      setActieveRun(run_id)
      setGebruikerPrompt('')
      await laadRuns()
      // Orchestrator is al getriggerd vanuit de server — geen extra call nodig
    }
    setBezig(false)
  }

  async function laadStapData(run: Run) {
    if (run.status !== 'wacht_op_goedkeuring') return
    const stap = run.huidige_stap

    if (stap === 1 && !stap1Data[run.id]) {
      const r = await fetch(`/api/pipeline/data/${run.id}/ideeen`)
      if (r.ok) { const data = await r.json(); setStap1Data(d => ({ ...d, [run.id]: data })) }
    }
    if (stap === 2 && !stap2Data[run.id]) {
      const r = await fetch(`/api/pipeline/data/${run.id}/marketing`)
      if (r.ok) { const data = await r.json(); setStap2Data(d => ({ ...d, [run.id]: data })) }
    }
    if (stap === 3 && !stap3Data[run.id]) {
      const r = await fetch(`/api/pipeline/data/${run.id}/landingpage`)
      if (r.ok) { const data = await r.json(); setStap3Data(d => ({ ...d, [run.id]: data })) }
    }
    if (stap === 4 && !stap4Data[run.id]) {
      const r = await fetch(`/api/pipeline/data/${run.id}/content`)
      if (r.ok) { const data = await r.json(); setStap4Data(d => ({ ...d, [run.id]: data })) }
    }
    if (stap === 5 && !stap5Data[run.id]) {
      const r = await fetch(`/api/pipeline/data/${run.id}/leads`)
      if (r.ok) { const data = await r.json(); setStap5Data(d => ({ ...d, [run.id]: data })) }
    }
    if (stap === 6 && !stap6Data[run.id]) {
      const r = await fetch(`/api/pipeline/data/${run.id}/outreach`)
      if (r.ok) { const data = await r.json(); setStap6Data(d => ({ ...d, [run.id]: data })) }
    }
  }

  async function keurGoed(runId: string, extra: Record<string, unknown> = {}) {
    setBezig(true)
    const res = await fetch(`/api/pipeline/${runId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(extra),
    })
    // Reset cache voor deze run
    setStap1Data(d => { const n = { ...d }; delete n[runId]; return n })
    setStap2Data(d => { const n = { ...d }; delete n[runId]; return n })
    await laadRuns()
    setBezig(false)
    // Orchestrator is al getriggerd vanuit de approve route — geen extra call nodig
  }

  async function keurAf(runId: string) {
    setBezig(true)
    await fetch(`/api/pipeline/${runId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reden: rejectReden }),
    })
    setShowReject(null)
    setRejectReden('')
    await laadRuns()
    setBezig(false)
  }

  function toggleRun(runId: string, run: Run) {
    if (actieveRun === runId) { setActieveRun(null); return }
    setActieveRun(runId)
    laadStapData(run)
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 mt-1">AI genereert ideeën → marketing → landingspagina → content → leads → outreach</p>
        </div>
        <button
          onClick={() => setShowPrompt(v => !v)}
          disabled={bezig}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2"
        >
          {bezig ? <><span className="animate-spin">⚙️</span> Bezig...</> : <><span>🚀</span> Nieuwe run</>}
        </button>
      </div>

      {/* Prompt invoer */}
      {showPrompt && !bezig && (
        <div className="bg-white border border-orange-200 rounded-xl p-4 mb-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-2">
            Geef de research agent een richting mee <span className="font-normal text-slate-400">(optioneel)</span>
          </p>
          <textarea
            value={gebruikerPrompt}
            onChange={e => setGebruikerPrompt(e.target.value)}
            placeholder="Bijv: focus op de bouwsector, of zoek iets voor ZZP-ers in de zorg, of ik wil een tool voor horeca-eigenaren…"
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 resize-none mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={startRun}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
            >
              🚀 Start run
            </button>
            <button
              onClick={() => { setShowPrompt(false); setGebruikerPrompt('') }}
              className="text-slate-500 hover:text-slate-700 px-4 py-2 text-sm"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Pipeline stappen legenda */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-1 flex-wrap">
          {STAP_LABELS.slice(1).map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-medium text-slate-700">
                {STAP_ICONS[i + 1]} {label}
              </span>
              {i < 5 && <span className="text-slate-300 text-sm">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Runs */}
      {!runs.length ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <div className="text-5xl mb-4">🚀</div>
          <p className="text-lg font-semibold text-slate-700">Nog geen pipeline runs</p>
          <p className="text-slate-400 text-sm mt-1">Klik op "Start nieuwe run" om de AI aan het werk te zetten.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map(run => (
            <div key={run.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Run header */}
              <button
                onClick={() => toggleRun(run.id, run)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition text-left"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">Run</span>
                      <span className="text-xs text-slate-400 font-mono">{run.id.slice(0, 8)}</span>
                      <StatusBadge status={run.status} />
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(run.created_at).toLocaleString('nl-NL')}
                      {run.status !== 'voltooid' && run.status !== 'afgewezen' && (
                        <span className="ml-2 text-slate-600">
                          Stap {run.huidige_stap}/6: {STAP_ICONS[run.huidige_stap]} {STAP_LABELS[run.huidige_stap]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Voortgangsbalk */}
                  <div className="hidden md:flex items-center gap-1">
                    {[1,2,3,4,5,6].map(s => (
                      <div key={s} className={`w-6 h-1.5 rounded-full ${
                        s < run.huidige_stap ? 'bg-green-400' :
                        s === run.huidige_stap && run.status !== 'afgewezen' ? 'bg-orange-400' :
                        'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                  <span className="text-slate-400">{actieveRun === run.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Uitklap content */}
              {actieveRun === run.id && (
                <div className="border-t border-gray-100 p-5">

                  {/* STAP 1: Ideeën kiezen */}
                  {run.status === 'wacht_op_goedkeuring' && run.huidige_stap === 1 && (
                    <StapIdeeen
                      ideeen={stap1Data[run.id] || []}
                      onKies={(ideeId) => keurGoed(run.id, { product_idea_id: ideeId })}
                      onAfwijzen={() => setShowReject(run.id)}
                      bezig={bezig}
                    />
                  )}

                  {/* STAP 2: Marketing plan */}
                  {run.status === 'wacht_op_goedkeuring' && run.huidige_stap === 2 && (
                    <StapMarketing
                      plan={stap2Data[run.id] || null}
                      onGoed={() => keurGoed(run.id)}
                      onAfwijzen={() => setShowReject(run.id)}
                      bezig={bezig}
                    />
                  )}

                  {/* STAP 3: Landing page */}
                  {run.status === 'wacht_op_goedkeuring' && run.huidige_stap === 3 && (
                    <StapLandingPage
                      data={stap3Data[run.id] || null}
                      onGoed={() => keurGoed(run.id)}
                      onAfwijzen={() => setShowReject(run.id)}
                      bezig={bezig}
                    />
                  )}

                  {/* STAP 4: Content posts */}
                  {run.status === 'wacht_op_goedkeuring' && run.huidige_stap === 4 && (
                    <StapContent
                      posts={stap4Data[run.id] || []}
                      onGoed={() => keurGoed(run.id)}
                      onAfwijzen={() => setShowReject(run.id)}
                      bezig={bezig}
                    />
                  )}

                  {/* STAP 5: Leads */}
                  {run.status === 'wacht_op_goedkeuring' && run.huidige_stap === 5 && (
                    <StapLeads
                      leads={stap5Data[run.id] || []}
                      onGoed={() => keurGoed(run.id)}
                      onAfwijzen={() => setShowReject(run.id)}
                      bezig={bezig}
                    />
                  )}

                  {/* STAP 6: Outreach emails */}
                  {run.status === 'wacht_op_goedkeuring' && run.huidige_stap === 6 && (
                    <StapOutreach
                      emails={stap6Data[run.id] || []}
                      onGoed={() => keurGoed(run.id)}
                      onAfwijzen={() => setShowReject(run.id)}
                      bezig={bezig}
                    />
                  )}

                  {/* Running state */}
                  {run.status === 'running' && (
                    <div className="text-center py-8">
                      <div className="text-3xl mb-3 animate-spin inline-block">⚙️</div>
                      <p className="font-semibold text-slate-700">
                        {STAP_ICONS[run.huidige_stap]} {STAP_LABELS[run.huidige_stap]} agent is bezig...
                      </p>
                      <p className="text-sm text-slate-400 mt-1">Pagina ververst automatisch</p>
                    </div>
                  )}

                  {/* Voltooid */}
                  {run.status === 'voltooid' && (
                    <div className="text-center py-6">
                      <div className="text-4xl mb-3">🎉</div>
                      <p className="font-bold text-green-700 text-lg">Pipeline voltooid!</p>
                      <div className="flex gap-3 justify-center mt-4 flex-wrap">
                        <a href="/dashboard/outreach" className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition">✉️ Outreach queue</a>
                        <a href="/dashboard/marketing" className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition">📱 Content bekijken</a>
                      </div>
                    </div>
                  )}

                  {/* Afgewezen */}
                  {run.status === 'afgewezen' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700 font-medium">❌ Afgewezen bij stap {run.huidige_stap}</p>
                      {run.afgewezen_reden && <p className="text-red-600 text-sm mt-1">{run.afgewezen_reden}</p>}
                    </div>
                  )}

                  {/* Reject modal */}
                  {showReject === run.id && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="font-medium text-red-700 mb-2">Waarom afwijzen?</p>
                      <input
                        value={rejectReden}
                        onChange={e => setRejectReden(e.target.value)}
                        placeholder="Optionele reden..."
                        className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-red-400"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => keurAf(run.id)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition">Afwijzen</button>
                        <button onClick={() => setShowReject(null)} className="bg-white border border-gray-200 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Annuleren</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Stap componenten ──────────────────────────────────────────────────────────

type BronItem = { bron: string; titel: string; tekst: string }

function BronDataInkijker({ bronnen }: { bronnen: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const brondata = (bronnen?.brondata as BronItem[]) || []
  if (!brondata.length) return null

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
      >
        {open ? '▲ Verberg brondata' : `▼ Bekijk brondata (${brondata.length} items)`}
      </button>
      {open && (
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
          {brondata.map((item, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
              <div className="flex items-center gap-1.5 mb-1">
                <BronLabel bron={item.bron} />
                <span className="text-xs font-medium text-slate-700 truncate">{item.titel}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{item.tekst}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BronLabel({ bron }: { bron: string }) {
  const config: Record<string, { label: string; kleur: string }> = {
    'google_trends': { label: 'Google Trends', kleur: 'bg-blue-50 text-blue-700 border-blue-200' },
    'linkedin': { label: 'LinkedIn', kleur: 'bg-sky-50 text-sky-700 border-sky-200' },
    'producthunt': { label: 'ProductHunt', kleur: 'bg-orange-50 text-orange-700 border-orange-200' },
  }
  const isReddit = bron.startsWith('reddit/')
  if (isReddit) return <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-red-50 text-red-700 border-red-200">{bron.replace('reddit/', '')}</span>
  const c = config[bron]
  if (c) return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${c.kleur}`}>{c.label}</span>
  return <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-gray-50 text-gray-600 border-gray-200">{bron}</span>
}

function StapIdeeen({ ideeen, onKies, onAfwijzen, bezig }: {
  ideeen: Idee[]; onKies: (id: string) => void; onAfwijzen: () => void; bezig: boolean
}) {
  const [toonBronnen, setToonBronnen] = useState(false)
  const typeKleur: Record<string, string> = {
    mini_tool: 'bg-blue-50 text-blue-700 border-blue-200',
    agent: 'bg-purple-50 text-purple-700 border-purple-200',
    saas: 'bg-orange-50 text-orange-700 border-orange-200',
    website: 'bg-green-50 text-green-700 border-green-200',
  }

  const eersteIdee = ideeen[0]
  const bronnenGebruikt = (eersteIdee?.bronnen?.gebruikt as string[]) || []
  const zoektermen = (eersteIdee?.bronnen?.zoektermen as string[]) || []

  return (
    <div>
      <h3 className="font-bold text-slate-900 mb-1">🔍 Stap 1 — Kies een product idee</h3>
      <p className="text-sm text-slate-500 mb-3">De Research agent heeft 3 ideeën gevonden. Kies er één om mee verder te gaan.</p>

      {/* Databronnen samenvatting */}
      {ideeen.length > 0 && (
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <button
            onClick={() => setToonBronnen(v => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Databronnen gebruikt</span>
            <div className="flex gap-1 flex-wrap">
              {bronnenGebruikt.map(b => <BronLabel key={b} bron={b} />)}
            </div>
            <span className="ml-auto text-slate-400 text-xs">{toonBronnen ? '▲ inklappen' : '▼ details'}</span>
          </button>
          {toonBronnen && zoektermen.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Zoektermen Claude gebruikte</p>
              <div className="flex flex-wrap gap-1.5">
                {zoektermen.map((t, i) => (
                  <span key={i} className="text-xs bg-white border border-slate-200 rounded-full px-2.5 py-1 text-slate-600 font-mono">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!ideeen.length ? (
        <p className="text-slate-400 text-sm">Data wordt geladen...</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {ideeen.map(idee => {
            const marktBewijs = idee.bronnen?.markt_bewijs as string | undefined
            const onderscheidend = idee.bronnen?.onderscheidend as string | undefined
            return (
              <div key={idee.id} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3 hover:border-orange-300 transition">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeKleur[idee.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {idee.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span className="text-xs font-bold text-slate-700">{idee.validatiescore}/10</span>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{idee.naam}</p>
                  <p className="text-sm text-slate-500 mt-0.5 italic">{idee.tagline}</p>
                </div>
                <p className="text-xs text-slate-600 flex-1">{idee.beschrijving}</p>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500"><span className="font-medium">Doelgroep:</span> {idee.doelgroep}</p>
                  <p className="text-xs text-slate-500"><span className="font-medium">Pijnpunt:</span> {idee.pijnpunt}</p>
                  <p className="text-xs font-bold text-orange-600">{idee.prijsindicatie}</p>
                </div>
                {marktBewijs && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-2">
                    <p className="text-xs text-blue-700"><span className="font-semibold">Bewijs:</span> {marktBewijs}</p>
                  </div>
                )}
                {onderscheidend && (
                  <div className="bg-green-50 border border-green-100 rounded-lg px-2.5 py-2">
                    <p className="text-xs text-green-700"><span className="font-semibold">vs ChatGPT:</span> {onderscheidend}</p>
                  </div>
                )}
                <BronDataInkijker bronnen={idee.bronnen} />
                <button
                  onClick={() => onKies(idee.id)}
                  disabled={bezig}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition"
                >
                  Kies dit idee →
                </button>
              </div>
            )
          })}
        </div>
      )}
      <button onClick={onAfwijzen} className="text-sm text-red-500 hover:text-red-700">Alle ideeën afwijzen</button>
    </div>
  )
}

function StapMarketing({ plan, onGoed, onAfwijzen, bezig }: {
  plan: MarketingPlan | null; onGoed: () => void; onAfwijzen: () => void; bezig: boolean
}) {
  return (
    <div>
      <h3 className="font-bold text-slate-900 mb-1">📊 Stap 2 — Marketing plan</h3>
      <p className="text-sm text-slate-500 mb-4">Controleer het ICP en de email strategie.</p>
      {!plan ? <p className="text-slate-400 text-sm">Data wordt geladen...</p> : (
        <div className="space-y-4 mb-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ICP</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(plan.icp || {}).slice(0, 6).map(([k, v]) => (
                <div key={k}><span className="text-slate-400">{k}:</span> <span className="text-slate-800 font-medium">{String(v)}</span></div>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Email sequentie</p>
            <div className="space-y-2">
              {(plan.email_strategie?.sequentie || []).map(mail => (
                <div key={mail.dag} className="text-sm">
                  <span className="text-slate-400">Dag {mail.dag}:</span>{' '}
                  <span className="font-medium text-slate-800">"{mail.onderwerp}"</span>
                  <span className="text-slate-500 text-xs block ml-8">{mail.haak}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Kernboodschappen</p>
            <ul className="space-y-1">
              {(plan.key_messages || []).map((m, i) => <li key={i} className="text-sm text-slate-700">• {m}</li>)}
            </ul>
          </div>
        </div>
      )}
      <GoedkeurBar onGoed={onGoed} onAfwijzen={onAfwijzen} bezig={bezig} />
    </div>
  )
}

function StapLandingPage({ data, onGoed, onAfwijzen, bezig }: {
  data: LandingPage | null; onGoed: () => void; onAfwijzen: () => void; bezig: boolean
}) {
  return (
    <div>
      <h3 className="font-bold text-slate-900 mb-1">🌐 Stap 3 — Landing page</h3>
      <p className="text-sm text-slate-500 mb-4">Copy geschreven, Stripe product aangemaakt.</p>
      {!data ? <p className="text-slate-400 text-sm">Data wordt geladen...</p> : (
        <div className="bg-slate-50 rounded-xl p-5 mb-4 space-y-3">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mb-1">Headline</p>
            <p className="text-xl font-bold text-slate-900">"{data.hero_headline}"</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mb-1">CTA</p>
            <p className="text-slate-700 font-medium">{data.cta_tekst}</p>
          </div>
          <div className="flex gap-3 flex-wrap pt-1">
            <a href={`/tools/${data.slug}`} target="_blank" className="text-sm text-orange-600 hover:underline">🔗 Preview landingspagina</a>
            {data.stripe_product_id && (
              <span className="text-sm text-green-600">✅ Stripe product aangemaakt</span>
            )}
          </div>
        </div>
      )}
      <GoedkeurBar onGoed={onGoed} onAfwijzen={onAfwijzen} bezig={bezig} />
    </div>
  )
}

function StapContent({ posts, onGoed, onAfwijzen, bezig }: {
  posts: ContentPost[]; onGoed: () => void; onAfwijzen: () => void; bezig: boolean
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const platformIcon: Record<string, string> = { linkedin: '💼', meta: '📘', instagram: '📸' }

  return (
    <div>
      <h3 className="font-bold text-slate-900 mb-1">📸 Stap 4 — Content posts</h3>
      <p className="text-sm text-slate-500 mb-4">3 kant-en-klare posts — foto + tekst + hashtags.</p>
      {!posts.length ? <p className="text-slate-400 text-sm">Data wordt geladen...</p> : (
        <div className="space-y-3 mb-4">
          {posts.map(post => (
            <div key={post.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === post.id ? null : post.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition text-left"
              >
                {post.afbeelding_url && (
                  <img src={post.afbeelding_url} alt={post.afbeelding_alt || ''} className="w-16 h-10 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-900">{platformIcon[post.platform]} {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}</span>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{post.tekst.slice(0, 80)}...</p>
                </div>
                <span className="text-slate-400 flex-shrink-0">{expanded === post.id ? '▲' : '▼'}</span>
              </button>
              {expanded === post.id && (
                <div className="border-t border-slate-100 p-4 space-y-3">
                  <img src={post.afbeelding_url} alt="" className="w-full max-w-sm rounded-xl object-cover" />
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{post.tekst}</p>
                  <p className="text-xs text-blue-600">{post.hashtags?.join(' ')}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <GoedkeurBar onGoed={onGoed} onAfwijzen={onAfwijzen} bezig={bezig} />
    </div>
  )
}

function StapLeads({ leads, onGoed, onAfwijzen, bezig }: {
  leads: Lead[]; onGoed: () => void; onAfwijzen: () => void; bezig: boolean
}) {
  return (
    <div>
      <h3 className="font-bold text-slate-900 mb-1">👥 Stap 5 — Leads</h3>
      <p className="text-sm text-slate-500 mb-4">{leads.length} bedrijven gevonden, gesorteerd op kwaliteit.</p>
      {!leads.length ? <p className="text-slate-400 text-sm">Data wordt geladen...</p> : (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="pb-2 pr-4">Bedrijf</th>
              <th className="pb-2 pr-4">Sector</th>
              <th className="pb-2 pr-4">Plaats</th>
              <th className="pb-2 pr-4">Score</th>
              <th className="pb-2">Notitie</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {leads.slice(0, 10).map(lead => (
                <tr key={lead.id}>
                  <td className="py-2 pr-4 font-medium text-slate-900">{lead.bedrijfsnaam}</td>
                  <td className="py-2 pr-4 text-slate-500">{lead.sector}</td>
                  <td className="py-2 pr-4 text-slate-500">{lead.plaats}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      lead.kwaliteit_score >= 7 ? 'bg-green-100 text-green-700' :
                      lead.kwaliteit_score >= 4 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{lead.kwaliteit_score}/10</span>
                  </td>
                  <td className="py-2 text-xs text-slate-400">{lead.notitie}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length > 10 && <p className="text-xs text-slate-400 mt-2">+{leads.length - 10} meer leads</p>}
        </div>
      )}
      <GoedkeurBar onGoed={onGoed} onAfwijzen={onAfwijzen} bezig={bezig} />
    </div>
  )
}

function StapOutreach({ emails, onGoed, onAfwijzen, bezig }: {
  emails: OutreachEmail[]; onGoed: () => void; onAfwijzen: () => void; bezig: boolean
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <div>
      <h3 className="font-bold text-slate-900 mb-1">✉️ Stap 6 — Outreach emails</h3>
      <p className="text-sm text-slate-500 mb-4">{emails.length} gepersonaliseerde emails klaarstaan. Na goedkeuring gaan ze in de verzendqueue.</p>
      {!emails.length ? <p className="text-slate-400 text-sm">Data wordt geladen...</p> : (
        <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
          {emails.slice(0, 10).map(email => (
            <div key={email.id} className="border border-slate-200 rounded-lg">
              <button
                onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition text-left"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{email.aan_bedrijf}</p>
                  <p className="text-xs text-slate-400">"{email.onderwerp}"</p>
                </div>
                <span className="text-slate-400">{expanded === email.id ? '▲' : '▼'}</span>
              </button>
              {expanded === email.id && (
                <div className="border-t border-slate-100 p-3">
                  <p className="text-xs text-slate-800 whitespace-pre-wrap">{email.mail_body}</p>
                </div>
              )}
            </div>
          ))}
          {emails.length > 10 && <p className="text-xs text-slate-400 pl-3">+{emails.length - 10} meer emails</p>}
        </div>
      )}
      <GoedkeurBar onGoed={onGoed} onAfwijzen={onAfwijzen} bezig={bezig} labelGoed="Goedkeuren & naar verzendqueue" />
    </div>
  )
}

function GoedkeurBar({ onGoed, onAfwijzen, bezig, labelGoed = 'Goedkeuren & volgende stap' }: {
  onGoed: () => void; onAfwijzen: () => void; bezig: boolean; labelGoed?: string
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        onClick={onGoed}
        disabled={bezig}
        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
      >
        ✅ {labelGoed}
      </button>
      <button
        onClick={onAfwijzen}
        disabled={bezig}
        className="bg-white border border-red-200 hover:bg-red-50 text-red-600 font-medium px-5 py-2.5 rounded-lg text-sm transition"
      >
        ❌ Afwijzen
      </button>
    </div>
  )
}
