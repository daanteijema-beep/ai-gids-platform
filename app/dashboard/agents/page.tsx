'use client'

import { useState, useEffect } from 'react'

const SECRET = process.env.NEXT_PUBLIC_CRON_SECRET || ''

type AgentStatus = 'idle' | 'running' | 'success' | 'error'
type Niche = { id: string; naam: string; icon: string }

type Agent = {
  id: string
  naam: string
  beschrijving: string
  icon: string
  endpoint: string
  methode: 'GET' | 'POST'
  kleur: string
  nicheSelector?: boolean
}

const AGENTS: Agent[] = [
  {
    id: 'trend-scout',
    naam: 'Trend Scout',
    beschrijving: 'Scrapt Google Trends, LinkedIn posts en Reddit voor actuele hooks en thema\'s per niche.',
    icon: '🔍',
    endpoint: '/api/agents/trend-scout',
    methode: 'GET',
    kleur: 'blue',
  },
  {
    id: 'outreach',
    naam: 'Outreach Agent',
    beschrijving: 'Vindt nieuwe vakbedrijven via Apify Google Maps, beoordeelt prospects en stuurt gepersonaliseerde emails.',
    icon: '🎯',
    endpoint: '/api/outreach',
    methode: 'POST',
    kleur: 'orange',
  },
  {
    id: 'marketing-research',
    naam: 'Marketing Research',
    beschrijving: 'Analyseert leads en outreach data per niche voor strategische aanbevelingen.',
    icon: '📊',
    endpoint: '/api/marketing/research',
    methode: 'POST',
    kleur: 'purple',
    nicheSelector: true,
  },
]

const KLEUR: Record<string, { bg: string; text: string; border: string; btn: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   btn: 'bg-blue-600 hover:bg-blue-700' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', btn: 'bg-orange-500 hover:bg-orange-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', btn: 'bg-purple-600 hover:bg-purple-700' },
}

export default function AgentsPage() {
  const [status, setStatus] = useState<Record<string, AgentStatus>>({})
  const [resultaten, setResultaten] = useState<Record<string, unknown>>({})
  const [logs, setLogs] = useState<Record<string, string>>({})
  const [niches, setNiches] = useState<Niche[]>([])
  const [selectedNiche, setSelectedNiche] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/niches').then(r => r.json()).then(d => {
      const list: Niche[] = d.niches || []
      setNiches(list)
      if (list.length) {
        const defaults: Record<string, string> = {}
        AGENTS.filter(a => a.nicheSelector).forEach(a => { defaults[a.id] = list[0].id })
        setSelectedNiche(defaults)
      }
    })
  }, [])

  async function startAgent(agent: Agent) {
    setStatus(s => ({ ...s, [agent.id]: 'running' }))
    setLogs(l => ({ ...l, [agent.id]: 'Agent gestart...' }))
    const start = Date.now()

    try {
      const url = `${agent.endpoint}?secret=${encodeURIComponent(SECRET)}`
      const body = agent.methode === 'POST'
        ? JSON.stringify(agent.nicheSelector ? { niche_id: selectedNiche[agent.id] } : {})
        : undefined

      const res = await fetch(url, {
        method: agent.methode,
        headers: agent.methode === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body,
      })
      const data = await res.json()
      const duur = ((Date.now() - start) / 1000).toFixed(1)

      if (res.ok) {
        setStatus(s => ({ ...s, [agent.id]: 'success' }))
        setResultaten(r => ({ ...r, [agent.id]: data }))
        setLogs(l => ({ ...l, [agent.id]: `Klaar in ${duur}s` }))
      } else {
        setStatus(s => ({ ...s, [agent.id]: 'error' }))
        setLogs(l => ({ ...l, [agent.id]: `Fout: ${data.error || res.statusText}` }))
      }
    } catch (e) {
      setStatus(s => ({ ...s, [agent.id]: 'error' }))
      setLogs(l => ({ ...l, [agent.id]: `Netwerkfout: ${String(e)}` }))
    }
  }

  function statusBadge(s: AgentStatus) {
    if (s === 'running') return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 animate-pulse">⚙️ Bezig...</span>
    if (s === 'success') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ Klaar</span>
    if (s === 'error')   return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">❌ Fout</span>
    return null
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <p className="text-gray-500 mt-1">Start agents handmatig. Alle agents draaien ook automatisch via cron.</p>
      </div>

      {/* Cron schema info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
        <h2 className="font-semibold text-slate-700 mb-3">Automatisch schema</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600"><span>🔍</span> Trend Scout — <span className="font-mono text-slate-800">07:00 ma-vr</span></div>
          <div className="flex items-center gap-2 text-slate-600"><span>🎯</span> Outreach — <span className="font-mono text-slate-800">09:00 ma-vr</span></div>
          <div className="flex items-center gap-2 text-slate-600"><span>📊</span> Research — <span className="font-mono text-slate-800">handmatig</span></div>
        </div>
      </div>

      {/* Agent kaarten */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {AGENTS.map(agent => {
          const k = KLEUR[agent.kleur]
          const s = status[agent.id] || 'idle'
          return (
            <div key={agent.id} className={`rounded-xl border ${k.border} ${k.bg} p-6 flex flex-col gap-4`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{agent.icon}</span>
                    <span className="font-bold text-slate-900">{agent.naam}</span>
                  </div>
                  <p className="text-sm text-slate-600">{agent.beschrijving}</p>
                </div>
                {statusBadge(s)}
              </div>

              {/* Niche selector voor agents die dat nodig hebben */}
              {agent.nicheSelector && niches.length > 0 && (
                <select
                  value={selectedNiche[agent.id] || ''}
                  onChange={e => setSelectedNiche(n => ({ ...n, [agent.id]: e.target.value }))}
                  disabled={s === 'running'}
                  className="w-full border border-white bg-white/70 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400 disabled:opacity-50"
                >
                  {niches.map(n => (
                    <option key={n.id} value={n.id}>{n.icon} {n.naam}</option>
                  ))}
                </select>
              )}

              {logs[agent.id] && (
                <div className="text-xs font-mono bg-white/70 rounded-lg px-3 py-2 text-slate-600 border border-white">
                  {logs[agent.id]}
                </div>
              )}

              <button
                onClick={() => startAgent(agent)}
                disabled={s === 'running' || (agent.nicheSelector && !selectedNiche[agent.id])}
                className={`${k.btn} disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2`}
              >
                {s === 'running' ? <><span className="animate-spin">⚙️</span> Bezig...</> : <><span>▶</span> Start {agent.naam}</>}
              </button>

              {/* Resultaat preview */}
              {!!resultaten[agent.id] && s === 'success' && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Resultaat bekijken</summary>
                  <pre className="mt-2 bg-white/70 rounded p-3 overflow-auto max-h-48 text-slate-700 border border-white">
                    {JSON.stringify(resultaten[agent.id], null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )
        })}
      </div>

      {/* Content generator shortcut */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-bold text-slate-900 mb-1">Content genereren per niche</h2>
        <p className="text-sm text-slate-500 mb-4">
          De Content Generator gebruikt automatisch de laatste Trend Scout data als input.
        </p>
        <a
          href="/dashboard/marketing"
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
        >
          <span>📱</span> Naar Marketing
        </a>
      </div>
    </div>
  )
}
