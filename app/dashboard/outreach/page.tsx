'use client'

import { useState, useEffect } from 'react'

type Email = {
  id: string
  aan_naam: string
  aan_bedrijf: string
  aan_email: string | null
  onderwerp: string
  mail_body: string
  status: string
  verstuurd_op: string | null
  created_at: string
  product_ideas?: { naam: string }
}

const STATUS_COLORS: Record<string, string> = {
  wacht_op_goedkeuring: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  verstuurd: 'bg-green-50 text-green-700 border-green-200',
  afgewezen: 'bg-red-50 text-red-600 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  wacht_op_goedkeuring: 'Wacht op verzending',
  verstuurd: 'Verstuurd',
  afgewezen: 'Afgewezen',
}

export default function OutreachPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('wacht_op_goedkeuring')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  async function fetchEmails() {
    setLoading(true)
    const res = await fetch('/api/outreach/queue')
    if (res.ok) {
      const data = await res.json()
      setEmails(data.emails || [])
    }
    setLoading(false)
  }

  useEffect(() => { void fetchEmails() }, [])

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await fetch('/api/outreach/queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status, verstuurd_op: status === 'verstuurd' ? new Date().toISOString() : e.verstuurd_op } : e))
    setUpdating(null)
  }

  const filtered = filter === 'all' ? emails : emails.filter(e => e.status === filter)

  const counts = {
    all: emails.length,
    wacht_op_goedkeuring: emails.filter(e => e.status === 'wacht_op_goedkeuring').length,
    verstuurd: emails.filter(e => e.status === 'verstuurd').length,
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Outreach Emails</h1>
        <p className="text-gray-500 mt-1">Door de AI gegenereerde cold emails op basis van Google Places leads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { key: 'all', label: 'Totaal', color: 'bg-slate-50 border-slate-200 text-slate-700' },
          { key: 'wacht_op_goedkeuring', label: 'Klaar om te sturen', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { key: 'verstuurd', label: 'Verstuurd', color: 'bg-green-50 border-green-200 text-green-700' },
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

      {/* Emails */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Laden...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📬</p>
          <p className="text-lg font-medium">Geen emails in deze categorie</p>
          <p className="text-sm mt-2">Emails worden aangemaakt nadat de outreach-writer agent heeft gedraaid.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((email) => (
            <div key={email.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === email.id ? null : email.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[email.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {STATUS_LABELS[email.status] || email.status}
                    </span>
                    {email.product_ideas?.naam && (
                      <span className="text-xs text-gray-400 truncate">{email.product_ideas.naam}</span>
                    )}
                  </div>
                  <div className="font-medium text-gray-900 truncate">{email.aan_bedrijf}</div>
                  <div className="text-sm text-gray-500 truncate">{email.onderwerp}</div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {email.aan_email && (
                    <span className="text-xs text-gray-400 hidden md:block">{email.aan_email}</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(email.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="text-gray-400">{expanded === email.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === email.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">Aan</div>
                    <div className="text-sm text-gray-800">{email.aan_bedrijf} {email.aan_email ? `— ${email.aan_email}` : '(geen email gevonden)'}</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">Onderwerp</div>
                    <div className="text-sm font-medium text-gray-800">{email.onderwerp}</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-500 mb-1">Email</div>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans bg-white border border-gray-200 rounded-lg p-3 leading-relaxed">
                      {email.mail_body}
                    </pre>
                  </div>

                  {email.status === 'wacht_op_goedkeuring' && (
                    <div className="flex gap-2">
                      {email.aan_email && (
                        <a
                          href={`mailto:${email.aan_email}?subject=${encodeURIComponent(email.onderwerp)}&body=${encodeURIComponent(email.mail_body)}`}
                          onClick={() => updateStatus(email.id, 'verstuurd')}
                          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                        >
                          Verstuur via mail-app
                        </a>
                      )}
                      <button
                        onClick={() => updateStatus(email.id, 'verstuurd')}
                        disabled={updating === email.id}
                        className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                      >
                        {updating === email.id ? 'Opslaan...' : 'Markeer als verstuurd'}
                      </button>
                      <button
                        onClick={() => updateStatus(email.id, 'afgewezen')}
                        disabled={updating === email.id}
                        className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg transition"
                      >
                        Overslaan
                      </button>
                    </div>
                  )}

                  {email.status === 'verstuurd' && email.verstuurd_op && (
                    <div className="text-xs text-green-600">
                      Verstuurd op {new Date(email.verstuurd_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
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
