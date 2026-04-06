'use client'

import { useState, useEffect } from 'react'

type Target = {
  id: string
  bedrijfsnaam: string
  sector: string
  plaats: string
  website: string | null
  email: string | null
  website_score: number | null
  agent_notitie: string | null
  status: string
  created_at: string
  niches?: { naam: string; icon: string }
}

const STATUS_COLORS: Record<string, string> = {
  gevonden: 'bg-slate-100 text-slate-600',
  mail_verstuurd: 'bg-blue-50 text-blue-700',
  gereageerd: 'bg-orange-50 text-orange-700',
  demo_gepland: 'bg-purple-50 text-purple-700',
  klant: 'bg-green-50 text-green-700',
  afgewezen: 'bg-red-50 text-red-600',
}

export default function OutreachPage() {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchTargets()
  }, [])

  async function fetchTargets() {
    setLoading(true)
    const res = await fetch('/api/outreach/list')
    if (res.ok) {
      const data = await res.json()
      setTargets(data.targets || [])
    }
    setLoading(false)
  }

  async function runOutreach() {
    setRunning(true)
    setLastRun(null)
    const res = await fetch('/api/outreach', { method: 'POST', headers: { authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev'}` } })
    const data = await res.json()
    setLastRun(JSON.stringify(data, null, 2))
    setRunning(false)
    fetchTargets()
  }

  const filtered = filter === 'all' ? targets : targets.filter(t => t.status === filter)

  const counts = {
    all: targets.length,
    gevonden: targets.filter(t => t.status === 'gevonden').length,
    mail_verstuurd: targets.filter(t => t.status === 'mail_verstuurd').length,
    gereageerd: targets.filter(t => t.status === 'gereageerd').length,
    klant: targets.filter(t => t.status === 'klant').length,
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach Pipeline</h1>
          <p className="text-gray-500 mt-1">AI vindt vakbedrijven, beoordeelt ze en verstuurt gepersonaliseerde emails</p>
        </div>
        <button
          onClick={runOutreach}
          disabled={running}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center gap-2"
        >
          {running ? (
            <><span className="animate-spin">⚙️</span> Agent draait...</>
          ) : (
            <><span>🚀</span> Agent starten</>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { key: 'all', label: 'Totaal gevonden', color: 'bg-slate-50 border-slate-200 text-slate-700' },
          { key: 'mail_verstuurd', label: 'Emails verstuurd', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { key: 'gereageerd', label: 'Reacties', color: 'bg-orange-50 border-orange-200 text-orange-700' },
          { key: 'klant', label: 'Geworden klant', color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`border rounded-xl p-4 text-left transition hover:shadow-sm ${color} ${filter === key ? 'ring-2 ring-orange-400' : ''}`}
          >
            <div className="text-2xl font-bold">{counts[key as keyof typeof counts] ?? 0}</div>
            <div className="text-sm font-medium mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {/* Uitleg agent */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-sm text-slate-600">
        <strong className="text-slate-800">Hoe werkt de agent?</strong> De agent kiest een willekeurige Twentse stad en sector,
        zoekt 5 vakbedrijven via Google Places, beoordeelt ze met Claude (heeft het een slechte/geen website?),
        schrijft een gepersonaliseerde email en verstuurt die. Alles wordt gelogd in de pipeline hieronder.
        De agent draait automatisch elke werkdag om 09:00 via Vercel Cron.
      </div>

      {lastRun && (
        <div className="bg-slate-900 text-green-400 rounded-xl p-4 mb-6 text-xs font-mono overflow-auto max-h-40">
          {lastRun}
        </div>
      )}

      {/* Tabel */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Laden...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🎯</p>
          <p className="text-lg font-medium">Nog geen bedrijven gevonden</p>
          <p className="text-sm mt-2">Start de agent om vakbedrijven te vinden en te benaderen.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bedrijf</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sector / Plaats</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Website</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50" title={t.agent_notitie || ''}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{t.bedrijfsnaam}</div>
                    {t.email && <div className="text-xs text-gray-400">{t.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <div>{t.sector}</div>
                    <div>{t.plaats}</div>
                  </td>
                  <td className="px-4 py-3">
                    {t.website ? (
                      <a href={t.website} target="_blank" rel="noopener" className="text-xs text-blue-500 hover:underline truncate max-w-32 block">
                        {t.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    ) : (
                      <span className="text-xs text-red-400">Geen website</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.website_score !== null ? (
                      <div className={`text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center ${t.website_score <= 3 ? 'bg-red-100 text-red-700' : t.website_score <= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {t.website_score}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(t.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
