'use client'

import { useState, useEffect } from 'react'

type ContentItem = {
  id: string
  type: string
  titel: string
  content: unknown
  status: string
  created_at: string
  scheduled_date: string | null
  platform: string | null
  niche_id: string
  niches?: { id: string; naam: string; icon: string }
}

type WeekGroup = {
  label: string
  weekStart: Date
  items: ContentItem[]
}

const TYPE_META: Record<string, { icon: string; label: string; platform: string; color: string }> = {
  linkedin_posts: { icon: '💼', label: 'LinkedIn', platform: 'LinkedIn', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  instagram_posts: { icon: '📸', label: 'Instagram', platform: 'Instagram', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  cold_email_sequence: { icon: '📧', label: 'Email', platform: 'Email', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  landing_page_copy: { icon: '🌐', label: 'Landingspagina', platform: 'Website', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  whatsapp_script: { icon: '💬', label: 'WhatsApp', platform: 'WhatsApp', color: 'bg-green-50 border-green-200 text-green-700' },
}

function makeGoogleCalendarUrl(title: string, description: string, date: Date): string {
  const start = new Date(date)
  start.setHours(9, 0, 0, 0)
  const end = new Date(start)
  end.setHours(10, 0, 0, 0)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace('.000', '')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(description.slice(0, 500))}&dates=${fmt(start)}/${fmt(end)}`
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekLabel(weekStart: Date): string {
  const now = getWeekStart(new Date())
  const diff = Math.round((weekStart.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000))
  if (diff === 0) return 'Deze week'
  if (diff === 1) return 'Volgende week'
  if (diff === -1) return 'Vorige week'
  if (diff > 1) return `Over ${diff} weken`
  return weekStart.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function renderPostPreview(item: ContentItem): string {
  const c = item.content
  if (Array.isArray(c) && c.length > 0) {
    const first = c[0] as Record<string, string>
    return first.tekst || first.inhoud || first.body || first.content || JSON.stringify(first).slice(0, 120)
  }
  if (typeof c === 'object' && c !== null) {
    const obj = c as Record<string, unknown>
    const text = obj.top_inzicht || obj.aanbevolen_hook || obj.tekst || obj.content
    if (typeof text === 'string') return text.slice(0, 150)
    return JSON.stringify(obj).slice(0, 150)
  }
  return String(c || '').slice(0, 150)
}

function renderFullContent(item: ContentItem) {
  const c = item.content
  if (Array.isArray(c)) {
    return (
      <div className="space-y-4">
        {(c as Array<Record<string, string>>).map((entry, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            {entry.onderwerp && <div className="font-semibold text-sm text-slate-700 mb-2">📧 {entry.onderwerp}</div>}
            {entry.titel && <div className="font-semibold text-sm text-slate-700 mb-2">{entry.titel}</div>}
            {entry.haak && <div className="font-semibold text-sm text-slate-700 mb-1">Hook: {entry.haak}</div>}
            <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
              {entry.tekst || entry.inhoud || entry.body || entry.content || JSON.stringify(entry, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    )
  }
  if (typeof c === 'object' && c !== null) {
    const obj = c as Record<string, unknown>
    return (
      <div className="space-y-3">
        {Object.entries(obj).map(([key, val]) => (
          <div key={key} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{key.replace(/_/g, ' ')}</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">
              {Array.isArray(val) ? val.join('\n') : String(val)}
            </div>
          </div>
        ))}
      </div>
    )
  }
  return <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">{String(c)}</pre>
}

export default function ContentCalendarPage() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeWeek, setActiveWeek] = useState(0)
  const [filterType, setFilterType] = useState('all')
  const [rescheduling, setRescheduling] = useState<string | null>(null)

  async function fetchContent() {
    setLoading(true)
    const res = await fetch('/api/marketing/list')
    if (res.ok) {
      const data = await res.json()
      setContent(data.content || [])
    }
    setLoading(false)
  }

  async function generateWeekContent() {
    setGenerating(true)
    // Trigger trend-scout voor verse data
    await fetch('/api/agents/trend-scout', { method: 'POST' })
    setGenerating(false)
    void fetchContent()
  }

  useEffect(() => { void fetchContent() }, [])

  async function reschedule(id: string, scheduled_date: string) {
    setRescheduling(id)
    await fetch('/api/marketing/list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, scheduled_date }),
    })
    setContent(prev => prev.map(c => c.id === id ? { ...c, scheduled_date } : c))
    setRescheduling(null)
  }

  // Groepeer per week op scheduled_date (of created_at als fallback)
  const weekGroups: WeekGroup[] = []
  const weekMap = new Map<number, WeekGroup>()

  for (const item of content) {
    const d = new Date(item.scheduled_date || item.created_at)
    const ws = getWeekStart(d)
    const key = ws.getTime()
    if (!weekMap.has(key)) {
      weekMap.set(key, { label: weekLabel(ws), weekStart: ws, items: [] })
    }
    weekMap.get(key)!.items.push(item)
  }

  weekMap.forEach(g => weekGroups.push(g))
  weekGroups.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())

  // Voeg lege toekomstige weken toe
  const now = getWeekStart(new Date())
  for (let i = 1; i <= 3; i++) {
    const futureWeek = new Date(now)
    futureWeek.setDate(futureWeek.getDate() + i * 7)
    if (!weekMap.has(futureWeek.getTime())) {
      weekGroups.unshift({ label: weekLabel(futureWeek), weekStart: futureWeek, items: [] })
    }
  }

  const activeGroup = weekGroups[activeWeek]
  const filteredItems = filterType === 'all'
    ? activeGroup?.items || []
    : activeGroup?.items.filter(i => i.type === filterType) || []

  const typeCounts = (activeGroup?.items || []).reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Content Kalender</h1>
          <p className="text-slate-500 mt-1 text-sm">Gegenereerde content per week — klaar om te posten</p>
        </div>
        <button
          onClick={generateWeekContent}
          disabled={generating}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm"
        >
          {generating ? (
            <><span className="animate-spin inline-block">⚙️</span> Trends ophalen...</>
          ) : (
            <><span>✨</span> Haal verse trends op</>
          )}
        </button>
      </div>

      {/* Week tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {weekGroups.map((group, i) => (
          <button
            key={group.weekStart.getTime()}
            onClick={() => { setActiveWeek(i); setExpanded(null) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition border ${
              activeWeek === i
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {group.label}
            {group.items.length > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeWeek === i ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {group.items.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Platform filter */}
      {activeGroup && activeGroup.items.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${filterType === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
          >
            Alles ({activeGroup.items.length})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => {
            const meta = TYPE_META[type]
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${filterType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                {meta?.icon} {meta?.label || type} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Laden...</div>
      ) : !activeGroup || activeGroup.items.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-20 text-center">
          <div className="text-4xl mb-3">📅</div>
          <p className="font-semibold text-slate-700 mb-1">Geen content voor {activeGroup?.label || 'deze week'}</p>
          <p className="text-sm text-slate-400 mb-6">Laat de pipeline draaien om automatisch content te genereren.</p>
          <button
            onClick={generateWeekContent}
            disabled={generating}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm"
          >
            {generating ? 'Bezig...' : 'Genereer content voor deze week'}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const meta = TYPE_META[item.type] || { icon: '📄', label: item.type, color: 'bg-slate-50 border-slate-200 text-slate-700' }
            const isOpen = expanded === item.id
            const preview = renderPostPreview(item)
            const postCount = Array.isArray(item.content) ? (item.content as unknown[]).length : null

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl overflow-hidden transition-all ${isOpen ? 'border-orange-300 shadow-lg shadow-orange-50 md:col-span-2 xl:col-span-3' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer'}`}
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {item.niches && (
                        <span className="text-xs text-slate-400">{item.niches.icon} {item.niches.naam}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {postCount && (
                    <div className="text-xs text-slate-400 mb-2">{postCount} posts</div>
                  )}

                  {!isOpen && (
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{preview}</p>
                  )}

                  <div className="flex items-center justify-between mt-3 gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'actief' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                      {item.status}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={makeGoogleCalendarUrl(
                          `${meta.icon} ${meta.label}${item.niches ? ` — ${item.niches.naam}` : ''}`,
                          renderPostPreview(item),
                          new Date(item.scheduled_date || item.created_at)
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-slate-400 hover:text-blue-500 transition font-medium border border-slate-200 hover:border-blue-300 px-2 py-0.5 rounded-lg"
                      >
                        📅 Google Cal
                      </a>
                      <input
                        type="date"
                        defaultValue={item.scheduled_date?.slice(0, 10) || item.created_at.slice(0, 10)}
                        disabled={rescheduling === item.id}
                        onClick={e => e.stopPropagation()}
                        onChange={e => { if (e.target.value) void reschedule(item.id, e.target.value) }}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-0.5 text-slate-500 hover:border-orange-300 focus:outline-none focus:border-orange-400 disabled:opacity-50 cursor-pointer"
                      />
                      <span className="text-xs text-orange-500 font-medium">
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                    {renderFullContent(item)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
