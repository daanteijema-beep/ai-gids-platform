'use client'

import { useEffect, useState } from 'react'

type Target = {
  id: string
  bedrijfsnaam: string
  sector: string | null
  plaats: string | null
  website: string | null
  email: string | null
  website_score: number | null
  agent_notitie: string | null
  status: string
  created_at: string
  niches?: { naam: string; icon: string } | null
}

type Email = {
  id: string
  aan_naam: string | null
  aan_bedrijf: string
  aan_email: string | null
  onderwerp: string
  mail_body: string
  status: string
  verstuurd_op: string | null
  created_at: string
  product_ideas?: { naam: string } | null
}

const TARGET_STATUS_COLORS: Record<string, string> = {
  gevonden: 'bg-slate-100 text-slate-700',
  mail_verstuurd: 'bg-blue-50 text-blue-700',
  gereageerd: 'bg-orange-50 text-orange-700',
  demo_gepland: 'bg-purple-50 text-purple-700',
  klant: 'bg-green-50 text-green-700',
  afgewezen: 'bg-red-50 text-red-600',
}

const EMAIL_STATUS_COLORS: Record<string, string> = {
  wacht_op_goedkeuring: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  verstuurd: 'bg-green-50 text-green-700 border-green-200',
  afgewezen: 'bg-red-50 text-red-600 border-red-200',
}

const EMAIL_STATUS_LABELS: Record<string, string> = {
  wacht_op_goedkeuring: 'Wacht op verzending',
  verstuurd: 'Verstuurd',
  afgewezen: 'Afgewezen',
}

type ViewMode = 'targets' | 'emails'
type TargetFilter = 'all' | 'gevonden' | 'mail_verstuurd' | 'gereageerd' | 'klant'
type EmailFilter = 'all' | 'wacht_op_goedkeuring' | 'verstuurd'

export default function OutreachPage() {
  const [targets, setTargets] = useState<Target[]>([])
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('emails')
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('all')
  const [emailFilter, setEmailFilter] = useState<EmailFilter>('wacht_op_goedkeuring')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)

    try {
      const [targetsRes, emailsRes] = await Promise.all([
        fetch('/api/outreach/list'),
        fetch('/api/outreach/queue'),
      ])

      if (targetsRes.ok) {
        const data = await targetsRes.json()
        setTargets(data.targets || [])
      }

      if (emailsRes.ok) {
        const data = await emailsRes.json()
        setEmails(data.emails || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  async function runOutreach() {
    setRunning(true)
    setLastRun(null)

    try {
      const res = await fetch('/api/outreach', { method: 'POST' })
      const data = await res.json()
      setLastRun(JSON.stringify(data, null, 2))
      await fetchData()
    } finally {
      setRunning(false)
    }
  }

  async function updateEmailStatus(id: string, status: string) {
    setUpdating(id)

    try {
      await fetch('/api/outreach/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })

      setEmails((prev) =>
        prev.map((email) =>
          email.id === id
            ? {
                ...email,
                status,
                verstuurd_op: status === 'verstuurd' ? new Date().toISOString() : email.verstuurd_op,
              }
            : email
        )
      )
    } finally {
      setUpdating(null)
    }
  }

  const filteredTargets =
    targetFilter === 'all' ? targets : targets.filter((target) => target.status === targetFilter)

  const filteredEmails =
    emailFilter === 'all' ? emails : emails.filter((email) => email.status === emailFilter)

  const targetCounts: Record<TargetFilter, number> = {
    all: targets.length,
    gevonden: targets.filter((target) => target.status === 'gevonden').length,
    mail_verstuurd: targets.filter((target) => target.status === 'mail_verstuurd').length,
    gereageerd: targets.filter((target) => target.status === 'gereageerd').length,
    klant: targets.filter((target) => target.status === 'klant').length,
  }

  const emailCounts: Record<EmailFilter, number> = {
    all: emails.length,
    wacht_op_goedkeuring: emails.filter((email) => email.status === 'wacht_op_goedkeuring').length,
    verstuurd: emails.filter((email) => email.status === 'verstuurd').length,
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach Pipeline</h1>
          <p className="mt-1 text-gray-500">
            AI vindt vakbedrijven, beoordeelt ze en zet gepersonaliseerde outreach klaar.
          </p>
        </div>

        <button
          onClick={runOutreach}
          disabled={running}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 font-semibold text-white transition hover:bg-orange-600 disabled:bg-orange-300"
        >
          {running ? (
            <>
              <span className="animate-spin">⚙️</span>
              Agent draait...
            </>
          ) : (
            <>
              <span>🚀</span>
              Agent starten
            </>
          )}
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        <strong className="text-slate-800">Hoe werkt dit?</strong> De agent zoekt bedrijven, beoordeelt hun
        websitekwaliteit en maakt vervolgens outreach-emails aan. Je kunt hieronder wisselen tussen de gevonden
        prospects en de mails die klaarstaan.
      </div>

      {lastRun && (
        <div className="mb-6 max-h-40 overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-green-400">
          {lastRun}
        </div>
      )}

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setView('targets')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            view === 'targets' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Prospects ({targets.length})
        </button>
        <button
          onClick={() => setView('emails')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            view === 'emails' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Emails ({emails.length})
        </button>
      </div>

      {view === 'targets' && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              { key: 'all' as const, label: 'Totaal', color: 'bg-slate-50 border-slate-200 text-slate-700' },
              { key: 'gevonden' as const, label: 'Gevonden', color: 'bg-slate-50 border-slate-200 text-slate-700' },
              { key: 'mail_verstuurd' as const, label: 'Mail verstuurd', color: 'bg-blue-50 border-blue-200 text-blue-700' },
              { key: 'gereageerd' as const, label: 'Gereageerd', color: 'bg-orange-50 border-orange-200 text-orange-700' },
              { key: 'klant' as const, label: 'Klant', color: 'bg-green-50 border-green-200 text-green-700' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setTargetFilter(key)}
                className={`rounded-xl border p-4 text-left transition hover:shadow-sm ${color} ${
                  targetFilter === key ? 'ring-2 ring-orange-400' : ''
                }`}
              >
                <div className="text-2xl font-bold">{targetCounts[key]}</div>
                <div className="mt-0.5 text-sm font-medium">{label}</div>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-400">Laden...</div>
          ) : filteredTargets.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <p className="mb-4 text-5xl">🎯</p>
              <p className="text-lg font-medium">Nog geen bedrijven gevonden</p>
              <p className="mt-2 text-sm">Start de agent om vakbedrijven te vinden en te beoordelen.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Bedrijf</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Sector / Plaats</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Website</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTargets.map((target) => (
                    <tr key={target.id} className="hover:bg-gray-50" title={target.agent_notitie || ''}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{target.bedrijfsnaam}</div>
                        <div className="text-xs text-gray-400">
                          {target.niches ? `${target.niches.icon} ${target.niches.naam}` : target.email || 'Geen email bekend'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div>{target.sector || 'Onbekend'}</div>
                        <div>{target.plaats || 'Onbekend'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {target.website ? (
                          <a
                            href={target.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-40 truncate text-xs text-blue-500 hover:underline"
                          >
                            {target.website.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        ) : (
                          <span className="text-xs text-red-400">Geen website</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {target.website_score !== null ? (
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                              target.website_score <= 3
                                ? 'bg-red-100 text-red-700'
                                : target.website_score <= 6
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {target.website_score}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            TARGET_STATUS_COLORS[target.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {target.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(target.created_at).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'emails' && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            {[
              { key: 'all' as const, label: 'Totaal', color: 'bg-slate-50 border-slate-200 text-slate-700' },
              {
                key: 'wacht_op_goedkeuring' as const,
                label: 'Klaar om te sturen',
                color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
              },
              { key: 'verstuurd' as const, label: 'Verstuurd', color: 'bg-green-50 border-green-200 text-green-700' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setEmailFilter(key)}
                className={`rounded-xl border p-4 text-left transition hover:shadow-sm ${color} ${
                  emailFilter === key ? 'ring-2 ring-orange-400' : ''
                }`}
              >
                <div className="text-2xl font-bold">{emailCounts[key]}</div>
                <div className="mt-0.5 text-sm font-medium">{label}</div>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-400">Laden...</div>
          ) : filteredEmails.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <p className="mb-4 text-5xl">📬</p>
              <p className="text-lg font-medium">Geen emails in deze categorie</p>
              <p className="mt-2 text-sm">Emails worden aangemaakt nadat de outreach-writer agent heeft gedraaid.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmails.map((email) => (
                <div key={email.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div
                    className="flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50"
                    onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                            EMAIL_STATUS_COLORS[email.status] || 'border-gray-200 bg-gray-100 text-gray-600'
                          }`}
                        >
                          {EMAIL_STATUS_LABELS[email.status] || email.status}
                        </span>
                        {email.product_ideas?.naam && (
                          <span className="truncate text-xs text-gray-400">{email.product_ideas.naam}</span>
                        )}
                      </div>
                      <div className="truncate font-medium text-gray-900">{email.aan_bedrijf}</div>
                      <div className="truncate text-sm text-gray-500">{email.onderwerp}</div>
                    </div>

                    <div className="ml-4 flex shrink-0 items-center gap-3">
                      {email.aan_email && <span className="hidden text-xs text-gray-400 md:block">{email.aan_email}</span>}
                      <span className="text-xs text-gray-400">
                        {new Date(email.created_at).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span className="text-gray-400">{expanded === email.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expanded === email.id && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                      <div className="mb-3">
                        <div className="mb-1 text-xs font-medium text-gray-500">Aan</div>
                        <div className="text-sm text-gray-800">
                          {email.aan_naam ? `${email.aan_naam} · ` : ''}
                          {email.aan_bedrijf}
                          {email.aan_email ? ` — ${email.aan_email}` : ' (geen email gevonden)'}
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="mb-1 text-xs font-medium text-gray-500">Onderwerp</div>
                        <div className="text-sm font-medium text-gray-800">{email.onderwerp}</div>
                      </div>

                      <div className="mb-4">
                        <div className="mb-1 text-xs font-medium text-gray-500">Email</div>
                        <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 font-sans text-sm leading-relaxed text-gray-800">
                          {email.mail_body}
                        </pre>
                      </div>

                      {email.status === 'wacht_op_goedkeuring' && (
                        <div className="flex gap-2">
                          {email.aan_email && (
                            <a
                              href={`mailto:${email.aan_email}?subject=${encodeURIComponent(email.onderwerp)}&body=${encodeURIComponent(email.mail_body)}`}
                              onClick={() => updateEmailStatus(email.id, 'verstuurd')}
                              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
                            >
                              Verstuur via mail-app
                            </a>
                          )}

                          <button
                            onClick={() => updateEmailStatus(email.id, 'verstuurd')}
                            disabled={updating === email.id}
                            className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
                          >
                            {updating === email.id ? 'Opslaan...' : 'Markeer als verstuurd'}
                          </button>

                          <button
                            onClick={() => updateEmailStatus(email.id, 'afgewezen')}
                            disabled={updating === email.id}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                          >
                            Overslaan
                          </button>
                        </div>
                      )}

                      {email.status === 'verstuurd' && email.verstuurd_op && (
                        <div className="text-xs text-green-600">
                          Verstuurd op{' '}
                          {new Date(email.verstuurd_op).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
