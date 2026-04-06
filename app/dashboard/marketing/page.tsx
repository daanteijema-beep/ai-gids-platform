'use client'

import { useState, useEffect } from 'react'

type Niche = { id: string; naam: string; icon: string; slug: string }
type Content = {
  id: string
  niche_id: string
  type: string
  titel: string
  content: unknown
  status: string
  created_at: string
  niches?: Niche
}

const TYPE_LABELS: Record<string, string> = {
  cold_email_sequence: '📧 Cold email reeks',
  linkedin_posts: '💼 LinkedIn posts',
  instagram_posts: '📸 Instagram posts',
  landing_page_copy: '🌐 Landingspagina tekst',
  whatsapp_script: '💬 WhatsApp script',
}

export default function MarketingPage() {
  const [niches, setNiches] = useState<Niche[]>([])
  const [content, setContent] = useState<Content[]>([])
  const [selectedNiche, setSelectedNiche] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('cold_email_sequence')
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/niches').then(r => r.json()).then(d => {
      setNiches(d.niches || [])
      if (d.niches?.length) setSelectedNiche(d.niches[0].id)
    })
    fetchContent()
  }, [])

  async function fetchContent() {
    const res = await fetch('/api/marketing/list')
    if (res.ok) {
      const data = await res.json()
      setContent(data.content || [])
    }
  }

  async function generate() {
    if (!selectedNiche || !selectedType) return
    setGenerating(true)
    await fetch('/api/marketing/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche_id: selectedNiche, type: selectedType }),
    })
    setGenerating(false)
    fetchContent()
  }

  function renderContent(item: Content) {
    const data = item.content as Record<string, unknown>
    if (Array.isArray(data)) {
      return (
        <div className="space-y-4">
          {(data as Array<Record<string, string>>).map((entry, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-4">
              {entry.onderwerp && <div className="font-semibold text-sm mb-1">📧 {entry.onderwerp}</div>}
              {entry.titel && <div className="font-semibold text-sm mb-1">{entry.titel}</div>}
              {entry.tekst && <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">{entry.tekst}</pre>}
              {entry.inhoud && <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">{entry.inhoud}</pre>}
            </div>
          ))}
        </div>
      )
    }
    return <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
  }

  const filteredContent = selectedNiche
    ? content.filter(c => c.niches?.id === selectedNiche || c.niche_id === selectedNiche)
    : content

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Marketing per Niche</h1>
        <p className="text-gray-500 mt-1">AI genereert cold emails, social posts en landingspagina-teksten per doelgroep</p>
      </div>

      {/* Generator */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
        <h2 className="font-bold text-slate-900 mb-4">🤖 Genereer nieuwe content</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Niche / Doelgroep</label>
            <select
              value={selectedNiche}
              onChange={e => setSelectedNiche(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            >
              {niches.map(n => (
                <option key={n.id} value={n.id}>{n.icon} {n.naam}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Type content</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            >
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generate}
              disabled={generating || !selectedNiche}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold px-5 py-2.5 rounded-lg transition flex items-center justify-center gap-2"
            >
              {generating ? (
                <><span className="animate-spin">⚙️</span> Claude genereert...</>
              ) : (
                <><span>✨</span> Genereer content</>
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Claude genereert sector-specifieke content in het Nederlands, op maat voor vakbedrijven in Twente.
        </p>
      </div>

      {/* Landingspagina links per niche */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-8">
        <h2 className="font-bold text-slate-900 mb-3">🌐 Niche landingspagina&apos;s</h2>
        <p className="text-sm text-slate-600 mb-4">
          Elke niche heeft een eigen landingspagina met specifieke tekst, testimonials en aanvraagflow.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {niches.map(n => (
            <a
              key={n.id}
              href={`/${n.slug}`}
              target="_blank"
              className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm hover:border-orange-400 hover:shadow-sm transition"
            >
              <span>{n.icon}</span>
              <span className="font-medium text-slate-700">{n.naam}</span>
              <span className="ml-auto text-orange-400">↗</span>
            </a>
          ))}
        </div>
      </div>

      {/* Gegenereerde content */}
      <div>
        <h2 className="font-bold text-slate-900 mb-4">📁 Gegenereerde content ({content.length})</h2>
        {content.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl">
            <p className="text-4xl mb-3">📄</p>
            <p className="font-medium">Nog geen content gegenereerd</p>
            <p className="text-sm mt-1">Gebruik de generator hierboven om te starten.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContent.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.niches?.icon || '📄'}</span>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {TYPE_LABELS[item.type] || item.type}
                        {item.niches && <span className="text-slate-400 font-normal"> · {item.niches.naam}</span>}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'actief' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.status}
                    </span>
                    <span className="text-slate-400">{expanded === item.id ? '▲' : '▼'}</span>
                  </div>
                </button>
                {expanded === item.id && (
                  <div className="border-t border-gray-100 p-5">
                    {renderContent(item)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
