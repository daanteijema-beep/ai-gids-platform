'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

type Idea = {
  id: string
  title: string
  niche: string
  subtitle: string
  target_audience: string
  problem_solved: string
  estimated_price: number
  research_rationale: string
  agent_confidence_score: number
  status: string
}

export default function IdeaDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoApprove = searchParams.get('autoApprove') === '1'
  const autoApproveRan = useRef(false)

  const [idea, setIdea] = useState<Idea | null>(null)
  const [pdfId, setPdfId] = useState<string | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState('')

  useEffect(() => {
    fetch(`/api/ideas/${id}`)
      .then(r => r.json())
      .then(d => {
        setIdea(d.idea)
        if (d.pdf) { setPdfId(d.pdf.id); setSlug(d.pdf.slug) }
      })
  }, [id])

  useEffect(() => {
    if (autoApprove && idea?.status === 'pending' && !autoApproveRan.current) {
      autoApproveRan.current = true
      approve()
    }
  }, [autoApprove, idea])

  const approve = async () => {
    setApproving(true)
    setApproveError('')
    try {
      const res = await fetch(`/api/ideas/${id}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setApproveError(data.error || 'Er ging iets mis'); return }
      setPdfId(data.pdfId)
      setSlug(data.slug)
      setIdea(prev => prev ? { ...prev, status: 'approved' } : prev)
      // Go straight to PDF dashboard
      router.push(`/dashboard/pdfs/${data.pdfId}`)
    } catch (err) {
      setApproveError(String(err))
    } finally {
      setApproving(false)
    }
  }

  const reject = async () => {
    await fetch(`/api/ideas/${id}/reject`, { method: 'POST' })
    router.push('/dashboard/ideas')
  }

  if (!idea) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Laden...</div>
  }

  const confidenceColor =
    idea.agent_confidence_score >= 75 ? 'text-green-600' :
    idea.agent_confidence_score >= 50 ? 'text-yellow-600' : 'text-red-500'

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => router.push('/dashboard/ideas')} className="text-sm text-gray-400 hover:text-gray-600">
        ← Terug naar ideeën
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{idea.niche}</span>
              <span className={`text-xs font-semibold ${confidenceColor}`}>{idea.agent_confidence_score}% confidence</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                idea.status === 'published' ? 'bg-green-100 text-green-700' :
                idea.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{idea.status}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{idea.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{idea.subtitle}</p>
          </div>
          <span className="text-3xl font-bold text-indigo-600 flex-shrink-0">€{idea.estimated_price}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Doelgroep</p>
            <p className="text-gray-700">{idea.target_audience}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Probleem dat het oplost</p>
            <p className="text-gray-700">{idea.problem_solved}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Onderbouwing research agent</p>
            <p className="text-gray-600 text-sm leading-relaxed">{idea.research_rationale}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {idea.status === 'pending' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-base mb-1">Wat wil je doen?</h2>
          <p className="text-sm text-gray-500 mb-4">
            Goedkeuren maakt een Stripe product + landingspagina aan (~30s). Daarna kun je per stap content genereren.
          </p>
          {approveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">{approveError}</div>
          )}
          <div className="flex gap-3">
            <button
              onClick={approve}
              disabled={approving}
              className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {approving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {approving ? 'Aanmaken...' : '✓ Goedkeuren'}
            </button>
            <button
              onClick={reject}
              className="border border-gray-300 text-gray-600 font-medium px-6 py-3 rounded-xl hover:bg-gray-50 transition"
            >
              Afwijzen
            </button>
          </div>
        </div>
      )}

      {(idea.status === 'approved' || idea.status === 'published') && pdfId && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-800">Product aangemaakt ✓</p>
            {slug && <p className="text-sm text-green-600 mt-0.5">vakwebtwente.vercel.app/{slug}</p>}
          </div>
          <button
            onClick={() => router.push(`/dashboard/pdfs/${pdfId}`)}
            className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-green-700 transition text-sm"
          >
            Naar PDF dashboard →
          </button>
        </div>
      )}
    </div>
  )
}
