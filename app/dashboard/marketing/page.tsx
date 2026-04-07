'use client'

import { useState, useEffect } from 'react'

type Insight = {
  id: string
  bron: string
  zoekterm: string
  titel: string
  samenvatting: string
  aanbevolen_hook: string | null
  week: string
  created_at: string
  niches?: { naam: string; icon: string }
}

type WeekSamenvatting = {
  week: string
  aantal: number
  hooks: string[]
  bronnen: string[]
}

type ContentItem = {
  id: string
  type: string
  titel: string
  content: unknown
  status: string
  created_at: string
  niches?: { naam: string; icon: string }
}

const BRON_META: Record<string, { icon: string; label: string; color: string }> = {
  google_trends: { icon: '📈', label: 'Google Trends', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  linkedin: { icon: '💼', label: 'LinkedIn', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  reddit: { icon: '🟠', label: 'Reddit', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  concurrent: { icon: '🔍', label: 'Concurrent', color: 'bg-red-50 text-red-700 border-red-200' },
}

const TYPE_META: Record<string, { icon: string; label: string }> = {
  cold_email_sequence: { icon: '📧', label: 'Cold email reeks' },
  linkedin_posts: { icon: '💼', label: 'LinkedIn posts' },
  instagram_posts: { icon: '📸', label: 'Instagram posts' },
  landing_page_copy: { icon: '🌐', label: 'Landingspagina tekst' },
  whatsapp_script: { icon: '💬', label: 'WhatsApp script' },
  trend_analyse: { icon: '📊', label: 'Trend analyse' },
}

function renderContentPreview(item: ContentItem): React.ReactNode {
  const c = item.content
  if (Array.isArray(c) && c.length > 0) {
    return (
      <div className="space-y-3">
        {(c as Array<Record<string, string>>).slice(0, 3).map((entry, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-4">
            {entry.onderwerp && <div className="font-semibold text-xs text-slate-500 mb-1 uppercase tracking-wide">Onderwerp</div>}
            {entry.onderwerp && <div className="font-medium text-sm text-slate-800 mb-2">{entry.onderwerp}</div>}
            {entry.titel && <div className="font-medium text-sm text-slate-800 mb-2">{entry.titel}</div>}
            {entry.haak && <div className="text-xs font-semibold text-orange-600 mb-2">Hook: {entry.haak}</div>}
            <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
              {(entry.tekst || entry.inhoud || entry.body || '').slice(0, 300)}
              {(entry.tekst || entry.inhoud || entry.body || '').length > 300 ? '...' : ''}
            </pre>
          </div>
        ))}
        {c.length > 3 && <div className="text-xs text-slate-400 text-center">+ {c.length - 3} meer posts</div>}
      </div>
    )
  }
  if (typeof c === 'object' && c !== null) {
    const obj = c as Record<string, unknown>
    return (
      <div className="space-y-3">
        {Object.entries(obj).slice(0, 4).map(([key, val]) => (
          <div key={key} className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{key.replace(/_/g, ' ')}</div>
            <div className="text-sm text-slate-700 leading-relaxed">
              {Array.isArray(val) ? (val as string[]).map((v, i) => <div key={i} className="mb-1">• {v}</div>) : String(val)}
            </div>
          </div>
        ))}
      </div>
    )
  }
  return <p className="text-sm text-slate-600">{String(c || '')}</p>
}

export default function MarketingPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [weekSamenvattingen, setWeekSamenvattingen] = useState<WeekSamenvatting[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [scrapingTrends, setScrapingTrends] = useState(false)
  const [activeTab, setActiveTab] = useState<'trends' | 'content'>('trends')
  const [activeWeek, setActiveWeek] = useState('')
  const [expandedContent, setExpandedContent] = useState<string | null>(null)

  async function fetchAll() {
    setLoading(true)
    const [insightsRes, contentRes] = await Promise.all([
      fetch('/api/content-insights'),
      fetch('/api/marketing/list'),
    ])
    if (insightsRes.ok) {
      const d = await insightsRes.json()
      setInsights(d.insights || [])
      setWeekSamenvattingen(d.weekSamenvattingen || [])
      if (d.weekSamenvattingen?.length > 0) setActiveWeek(d.weekSamenvattingen[0].week)
    }
    if (contentRes.ok) {
      const d = await contentRes.json()
      setContent(d.content || [])
    }
    setLoading(false)
  }

  async function scrapeTrends() {
    setScrapingTrends(true)
    await fetch('/api/agents/trend-scout', { method: 'POST' })
    setScrapingTrends(false)
    void fetchAll()
  }

  useEffect(() => { void fetchAll() }, [])

  const weekInsights = insights.filter(i => !activeWeek || i.week === activeWeek)
  const activeWeekData = weekSamenvattingen.find(w => w.week === activeWeek)

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Marketing Strategie</h1>
          <p className="text-slate-500 mt-1 text-sm">Trendinzichten van Reddit, LinkedIn en Google Trends + gegenereerde content</p>
        </div>
        <button
          onClick={scrapeTrends}
          disabled={scrapingTrends}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm"
        >
          {scrapingTrends ? <><span className="animate-spin inline-block">⚙️</span> Scrapen...</> : <><span>🔍</span> Scrape trends</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
        {[
          { key: 'trends', label: '📊 Trend inzichten' },
          { key: 'content', label: '📄 Gegenereerde content' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'trends' | 'content')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Laden...</div>
      ) : activeTab === 'trends' ? (
        <>
          {weekSamenvattingen.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-20 text-center">
              <div className="text-4xl mb-3">📡</div>
              <p className="font-semibold text-slate-700 mb-1">Nog geen trend data</p>
              <p className="text-sm text-slate-400 mb-6">Klik &apos;Scrape trends&apos; om Reddit, LinkedIn en Google Trends te scannen voor jouw niches.</p>
              <button
                onClick={scrapeTrends}
                disabled={scrapingTrends}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm"
              >
                {scrapingTrends ? 'Bezig...' : 'Scrape nu'}
              </button>
            </div>
          ) : (
            <>
              {/* Week selector */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {weekSamenvattingen.map(w => (
                  <button
                    key={w.week}
                    onClick={() => setActiveWeek(w.week)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition ${activeWeek === w.week ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                  >
                    {w.week} <span className="opacity-60 ml-1">({w.aantal})</span>
                  </button>
                ))}
              </div>

              {/* Aanbevolen hooks voor deze week */}
              {activeWeekData?.hooks && activeWeekData.hooks.length > 0 && (
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 mb-6 text-white">
                  <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">Aanbevolen hooks deze week</div>
                  <div className="space-y-3">
                    {activeWeekData.hooks.map((hook, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-orange-200 font-bold text-sm shrink-0">{i + 1}.</span>
                        <p className="text-white font-medium leading-relaxed">&quot;{hook}&quot;</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-orange-400/30">
                    {activeWeekData.bronnen.map(b => (
                      <span key={b} className={`text-xs px-2 py-0.5 rounded-full border ${BRON_META[b]?.color || 'bg-white/20 text-white border-white/20'}`}>
                        {BRON_META[b]?.icon} {BRON_META[b]?.label || b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inzichten grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {weekInsights.map((insight) => {
                  const bron = BRON_META[insight.bron] || { icon: '📰', label: insight.bron, color: 'bg-slate-50 text-slate-600 border-slate-200' }
                  return (
                    <div key={insight.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${bron.color}`}>
                          {bron.icon} {bron.label}
                        </span>
                        {insight.niches && (
                          <span className="text-xs text-slate-400">{insight.niches.icon} {insight.niches.naam}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm mb-2 leading-snug">{insight.titel}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{insight.samenvatting}</p>
                      {insight.aanbevolen_hook && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="text-xs font-semibold text-orange-600 mb-1">Hook voor content:</div>
                          <p className="text-xs text-slate-600 italic">&quot;{insight.aanbevolen_hook}&quot;</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      ) : (
        /* Content tab */
        <>
          {content.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-20 text-center">
              <div className="text-4xl mb-3">📄</div>
              <p className="font-semibold text-slate-700 mb-1">Nog geen content gegenereerd</p>
              <p className="text-sm text-slate-400">Start een pipeline run om automatisch content te genereren.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {content.map((item) => {
                const meta = TYPE_META[item.type] || { icon: '📄', label: item.type }
                const isOpen = expandedContent === item.id
                return (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedContent(isOpen ? null : item.id)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{meta.icon}</span>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {meta.label}
                            {item.niches && <span className="text-slate-400 font-normal"> · {item.niches.icon} {item.niches.naam}</span>}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'actief' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                          {item.status}
                        </span>
                        <span className="text-slate-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                        {renderContentPreview(item)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
