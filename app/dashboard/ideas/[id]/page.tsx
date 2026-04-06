'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

type Step = {
  key: string
  label: string
  description: string
  icon: string
  status: 'waiting' | 'running' | 'done' | 'error'
  result?: string
}

const INITIAL_STEPS: Step[] = [
  { key: 'website', label: 'Landingspagina', description: 'Stripe product + pagina content genereren', icon: '🌐', status: 'waiting' },
  { key: 'pdf', label: 'PDF Template', description: 'Niche template aanmaken voor gepersonaliseerde PDFs', icon: '📄', status: 'waiting' },
  { key: 'mail', label: 'Email sequenties', description: 'Lead nurture emails + aankondiging aan bestaande leads', icon: '📧', status: 'waiting' },
  { key: 'social', label: 'Social media content', description: '21 posts voor Instagram, LinkedIn en TikTok', icon: '📱', status: 'waiting' },
]

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

type SocialPost = {
  id: string
  platform: string
  post_type: string
  content_text: string
  hashtags: string[]
  visual_description: string
  scheduled_date: string
  status: string
}

type EmailSeq = {
  trigger: string
  subject: string
  delay_hours: number
}

const PLATFORM_ICON: Record<string, string> = { instagram: '📸', linkedin: '💼', tiktok: '🎵' }

function generateImageUrl(visualDescription: string): string {
  const prompt = encodeURIComponent(
    `${visualDescription}, professional social media post, clean modern design, Dutch entrepreneur, high quality`
  )
  return `https://image.pollinations.ai/prompt/${prompt}?model=flux&width=512&height=512&nologo=true`
}
const TYPE_COLOR: Record<string, string> = {
  awareness: 'bg-blue-100 text-blue-700',
  interest: 'bg-yellow-100 text-yellow-700',
  conversion: 'bg-green-100 text-green-700',
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
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS)
  const [phase, setPhase] = useState<'review' | 'executing' | 'done' | 'error'>('review')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([])
  const [emailSeqs, setEmailSeqs] = useState<EmailSeq[]>([])
  const [activeTab, setActiveTab] = useState<'instagram' | 'linkedin' | 'tiktok'>('instagram')
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set())

  const loadPostExecutionData = async (pid: string) => {
    const [postsRes, emailRes] = await Promise.allSettled([
      fetch(`/api/ideas/${id}/social-posts`),
      fetch(`/api/ideas/${id}/email-sequences`),
    ])
    if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
      const d = await postsRes.value.json()
      setSocialPosts(d.posts || [])
    }
    if (emailRes.status === 'fulfilled' && emailRes.value.ok) {
      const d = await emailRes.value.json()
      setEmailSeqs(d.sequences || [])
    }
  }

  useEffect(() => {
    fetch(`/api/ideas/${id}`)
      .then(r => r.json())
      .then(d => {
        setIdea(d.idea)
        if (d.pdf) {
          setPdfId(d.pdf.id)
          setSlug(d.pdf.slug)
          if (d.idea?.status === 'published') {
            loadPostExecutionData(d.pdf.id)
            setPhase('done')
          }
        }
      })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (autoApprove && idea && idea.status === 'pending' && !autoApproveRan.current) {
      autoApproveRan.current = true
      approve()
    }
  }, [autoApprove, idea])

  const approve = async () => {
    setPhase('executing')
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'waiting' })))
    setSteps(s => s.map(st => st.key === 'website' ? { ...st, status: 'running' } : st))

    try {
      const res = await fetch(`/api/ideas/${id}/approve`, {
        method: 'POST',
        headers: { 'x-dashboard-password': 'admin123' },
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Er ging iets mis')
        setPhase('error')
        setSteps(s => s.map(st => st.key === 'website' ? { ...st, status: 'error' } : st))
        return
      }

      const exec = data.execution
      const newSlug = exec?.slug
      const newPdfId = exec?.pdfId

      setSteps(s => s.map(st => {
        const sub = exec?.subagents?.[st.key]
        if (!sub) return { ...st, status: 'done' }
        const isDone = !sub.includes('failed')
        return { ...st, status: isDone ? 'done' : 'error', result: sub }
      }))

      if (newSlug) setSlug(newSlug)
      if (newPdfId) {
        setPdfId(newPdfId)
        await loadPostExecutionData(newPdfId)
      }

      setIdea(prev => prev ? { ...prev, status: 'published' } : prev)
      setPhase('done')

    } catch (err) {
      setErrorMsg(String(err))
      setPhase('error')
    }
  }

  const reject = async () => {
    await fetch(`/api/ideas/${id}/reject`, {
      method: 'POST',
      headers: { 'x-dashboard-password': 'admin123' },
    })
    router.push('/dashboard/ideas')
  }

  const publishPost = async (postId: string) => {
    setPublishingId(postId)
    try {
      const res = await fetch(`/api/social/${postId}/publish`, { method: 'POST' })
      if (res.ok) {
        setPublishedIds(prev => new Set(prev).add(postId))
        setSocialPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'published' } : p))
      }
    } catch {
      // ignore
    } finally {
      setPublishingId(null)
    }
  }

  if (!idea) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <span className="animate-spin mr-2">⏳</span> Laden...
      </div>
    )
  }

  const confidenceColor =
    idea.agent_confidence_score >= 75 ? 'text-green-600' :
    idea.agent_confidence_score >= 50 ? 'text-yellow-600' : 'text-red-500'

  const filteredPosts = socialPosts.filter(p => p.platform === activeTab)

  return (
    <div className="max-w-4xl space-y-6">
      <button onClick={() => router.push('/dashboard/ideas')} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
        ← Terug naar ideeën
      </button>

      {/* Idea details */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{idea.niche}</span>
              <span className={`text-xs font-medium ${confidenceColor}`}>{idea.agent_confidence_score}% confidence</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                idea.status === 'published' ? 'bg-green-100 text-green-700' :
                idea.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                idea.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>{idea.status}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 leading-snug">{idea.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{idea.subtitle}</p>
          </div>
          <span className="text-3xl font-bold text-indigo-600 flex-shrink-0">€{idea.estimated_price}</span>
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Doelgroep</p>
            <p className="text-gray-700">{idea.target_audience}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Probleem</p>
            <p className="text-gray-700">{idea.problem_solved}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Onderbouwing agent</p>
            <p className="text-gray-700">{idea.research_rationale}</p>
          </div>
        </div>
      </div>

      {/* Execution progress */}
      {phase !== 'review' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">
            {phase === 'executing' ? '⚙️ Agents aan het werk...' :
             phase === 'done' ? '✅ Alles aangemaakt!' :
             '❌ Er ging iets mis'}
          </h2>
          <div className="space-y-3">
            {steps.map(step => (
              <div key={step.key} className={`flex items-start gap-4 p-4 rounded-xl border transition ${
                step.status === 'done' ? 'bg-green-50 border-green-200' :
                step.status === 'running' ? 'bg-indigo-50 border-indigo-200' :
                step.status === 'error' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-100'
              }`}>
                <div className="text-2xl flex-shrink-0 mt-0.5">{step.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{step.label}</span>
                    {step.status === 'running' && <span className="text-xs text-indigo-600 animate-pulse">Bezig...</span>}
                    {step.status === 'done' && <span className="text-xs text-green-600">✓ Klaar</span>}
                    {step.status === 'error' && <span className="text-xs text-red-500">✗ Mislukt</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                  {step.result && <p className="text-xs text-gray-600 mt-1 font-medium">{step.result}</p>}
                </div>
              </div>
            ))}
          </div>
          {phase === 'executing' && (
            <p className="text-sm text-gray-400 mt-4 text-center">Dit duurt 30–90 seconden — alle agents draaien parallel...</p>
          )}
          {phase === 'error' && errorMsg && (
            <p className="text-sm text-red-600 mt-3 bg-red-50 rounded-lg p-3">{errorMsg}</p>
          )}
        </div>
      )}

      {/* Results */}
      {phase === 'done' && slug && (
        <>
          {/* Landing page */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-3">🌐 Landingspagina</h2>
            <div className="flex items-center gap-3">
              <code className="text-sm bg-gray-100 px-3 py-2 rounded-lg flex-1 truncate text-gray-700">
                vakwebtwente.vercel.app/{slug}
              </code>
              <a
                href={`https://vakwebtwente.vercel.app/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-indigo-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm flex-shrink-0"
              >
                Bekijk pagina →
              </a>
            </div>
          </div>

          {/* Email sequences */}
          {emailSeqs.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-3">📧 Email Sequenties ({emailSeqs.length} emails klaar)</h2>
              <div className="space-y-2">
                {emailSeqs.map((email, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Trigger: <span className="font-mono bg-gray-100 px-1 rounded">{email.trigger}</span>
                        {email.delay_hours > 0 && ` · na ${email.delay_hours}u`}
                      </p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">Klaar</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">Emails worden automatisch verstuurd via Resend op basis van trigger events.</p>
            </div>
          )}

          {/* Social posts */}
          {socialPosts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">📱 Social Media Content ({socialPosts.length} posts)</h2>
                <a href="/dashboard/social" className="text-sm text-indigo-600 hover:underline">Bekijk kalender →</a>
              </div>

              <div className="flex gap-2 mb-4">
                {(['instagram', 'linkedin', 'tiktok'] as const).map(platform => {
                  const count = socialPosts.filter(p => p.platform === platform).length
                  return (
                    <button
                      key={platform}
                      onClick={() => setActiveTab(platform)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                        activeTab === platform
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {PLATFORM_ICON[platform]} {platform} ({count})
                    </button>
                  )
                })}
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredPosts.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Geen posts voor dit platform.</p>
                )}
                {filteredPosts.map(post => {
                  const isPublished = post.status === 'published' || publishedIds.has(post.id)
                  const isPublishing = publishingId === post.id
                  return (
                    <div key={post.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[post.post_type] || 'bg-gray-100 text-gray-600'}`}>
                              {post.post_type}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(post.scheduled_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                            </span>
                            {isPublished && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Gepubliceerd</span>}
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content_text}</p>
                          {post.hashtags?.length > 0 && (
                            <p className="text-xs text-indigo-500 mt-2">{post.hashtags.join(' ')}</p>
                          )}
                          {post.visual_description && (
                            <div className="mt-2 flex items-start gap-2">
                              {post.platform === 'instagram' && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={generateImageUrl(post.visual_description)}
                                  alt="gegenereerde afbeelding"
                                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                                  loading="lazy"
                                />
                              )}
                              <p className="text-xs text-gray-400 bg-gray-50 rounded px-2 py-1 flex-1">
                                <span className="font-medium">Beeld: </span>{post.visual_description}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 mt-1">
                          {!isPublished ? (
                            <button
                              onClick={() => publishPost(post.id)}
                              disabled={isPublishing}
                              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 font-medium whitespace-nowrap"
                            >
                              {isPublishing ? '...' : 'Publiceer nu'}
                            </button>
                          ) : (
                            <span className="text-green-600 text-sm">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Action buttons — review phase */}
      {phase === 'review' && idea.status === 'pending' && (
        <div className="flex items-center gap-3">
          <button
            onClick={approve}
            className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition"
          >
            Goedkeuren & publiceren
          </button>
          <button
            onClick={reject}
            className="border border-gray-300 text-gray-600 font-medium px-6 py-3 rounded-xl hover:bg-gray-50 transition"
          >
            Afwijzen
          </button>
        </div>
      )}

      {idea.status !== 'pending' && phase === 'review' && (
        <div className="text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
          Status: <span className="font-medium">{idea.status}</span>
          {idea.status === 'published' && slug && (
            <a href={`https://vakwebtwente.vercel.app/${slug}`} target="_blank" className="ml-3 text-indigo-600 underline">
              Bekijk pagina →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
