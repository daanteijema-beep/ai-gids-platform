'use client'

import { useState } from 'react'

type FormField = {
  key: string
  label: string
  type: string
  options?: string[]
  required: boolean
}

type Idea = {
  id: string
  title: string
  subtitle: string
  niche: string
  target_audience: string
  problem_solved: string
  estimated_price: number
  research_rationale: string
  agent_confidence_score: number
  form_fields: FormField[]
  created_at: string
}

export default function IdeaCard({ idea }: { idea: Idea }) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)
  const [expanded, setExpanded] = useState(false)

  const act = async (action: 'approve' | 'reject') => {
    setLoading(action)
    try {
      const res = await fetch(`/api/ideas/${idea.id}/${action}`, {
        method: 'POST',
        headers: { 'x-dashboard-password': 'admin123' },
      })
      if (res.ok) {
        setDone(action === 'approve' ? 'approved' : 'rejected')
      }
    } catch {
      // ignore
    } finally {
      setLoading(null)
    }
  }

  if (done === 'rejected') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 opacity-50">
        <p className="text-gray-400 line-through text-sm">{idea.title} — afgewezen</p>
      </div>
    )
  }

  if (done === 'approved') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-green-700 font-medium">{idea.title}</p>
        <p className="text-green-600 text-sm mt-1">Goedgekeurd — execution agent draait nu op de achtergrond...</p>
      </div>
    )
  }

  const confidenceColor =
    idea.agent_confidence_score >= 75 ? 'text-green-600' :
    idea.agent_confidence_score >= 50 ? 'text-yellow-600' : 'text-red-500'

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{idea.niche}</span>
              <span className={`text-xs font-medium ${confidenceColor}`}>
                {idea.agent_confidence_score}% confidence
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-lg leading-snug">{idea.title}</h3>
            <p className="text-gray-500 text-sm mt-1">{idea.subtitle}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-indigo-600">€{idea.estimated_price}</p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-indigo-500 mt-3 hover:underline"
        >
          {expanded ? 'Minder tonen ↑' : 'Onderbouwing + vragen tonen ↓'}
        </button>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Doelgroep</p>
              <p className="text-sm text-gray-700">{idea.target_audience}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Probleem dat het oplost</p>
              <p className="text-sm text-gray-700">{idea.problem_solved}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Onderbouwing agent</p>
              <p className="text-sm text-gray-700">{idea.research_rationale}</p>
            </div>
            {idea.form_fields?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Vragen aan de klant ({idea.form_fields.length})</p>
                <div className="space-y-1">
                  {idea.form_fields.map((f) => (
                    <div key={f.key} className="text-xs bg-gray-50 rounded px-3 py-2 text-gray-600">
                      <span className="font-medium">{f.label}</span>
                      {f.type === 'select' && f.options && (
                        <span className="text-gray-400"> · {f.options.join(' / ')}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {new Date(idea.created_at).toLocaleDateString('nl-NL')}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => act('reject')}
            disabled={!!loading}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
          >
            {loading === 'reject' ? '...' : 'Afwijzen'}
          </button>
          <button
            onClick={() => act('approve')}
            disabled={!!loading}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 font-medium"
          >
            {loading === 'approve' ? 'Starten...' : 'Goedkeuren & publiceren'}
          </button>
        </div>
      </div>
    </div>
  )
}
