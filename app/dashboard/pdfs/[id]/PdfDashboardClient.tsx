'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const PLATFORM_ICON: Record<string, string> = { instagram: '📸', linkedin: '💼', tiktok: '🎵' }
const TYPE_COLOR: Record<string, string> = {
  awareness: 'bg-blue-100 text-blue-700',
  interest: 'bg-yellow-100 text-yellow-700',
  conversion: 'bg-green-100 text-green-700',
}

type Post = {
  id: string; platform: string; post_type: string; content_text: string
  hashtags: string[]; visual_description: string; scheduled_date: string; status: string
}
type Lead = { id: string; email: string; name: string | null; created_at: string; source: string }
type Order = { id: string; customer_name: string; customer_email: string; status: string; created_at: string }
type EmailSeq = { trigger: string; subject: string; delay_hours: number }

type StepKey = 'pdf' | 'social' | 'images' | 'mail' | 'leads'
type StepStatus = 'idle' | 'loading' | 'done' | 'error'

const STEPS: { key: StepKey; label: string; icon: string; description: string }[] = [
  { key: 'pdf', label: 'PDF genereren', icon: '📄', description: 'Schrijft de volledige gids (~45s)' },
  { key: 'images', label: 'Afbeeldingen', icon: '🖼️', description: 'Hero, cover + Instagram posts' },
  { key: 'social', label: 'Social content', icon: '📱', description: '6 posts voor Instagram & Facebook' },
  { key: 'mail', label: 'Email sequenties', icon: '📧', description: '4 emails klaar voor leads' },
  { key: 'leads', label: 'Leads zoeken', icon: '🎯', description: 'Communities + outreach scripts (~2min)' },
]

export default function PdfDashboardClient({ data }: { data: any }) {
  const { pdf, landing, template, posts, leads, orders, emailSequences, outreachData } = data
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'images' | 'social' | 'template' | 'leads' | 'emails'>('overview')
  const [socialPlatform, setSocialPlatform] = useState<'instagram' | 'linkedin' | 'tiktok'>('instagram')
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set())
  const [stepStatus, setStepStatus] = useState<Record<StepKey, StepStatus>>({
    pdf: 'idle', social: 'idle', images: 'idle', mail: 'idle', leads: 'idle',
  })
  const [stepResult, setStepResult] = useState<Record<StepKey, string>>({
    pdf: '', social: '', images: '', mail: '', leads: '',
  })

  const revenue = orders.filter((o: Order) => ['paid', 'generated', 'delivered'].includes(o.status)).length * pdf.price
  const appUrl = 'https://vakwebtwente.vercel.app'
  const images = pdf.images || {}

  const runStep = async (step: StepKey) => {
    setStepStatus(s => ({ ...s, [step]: 'loading' }))
    setStepResult(s => ({ ...s, [step]: '' }))
    try {
      const res = await fetch(`/api/agents/step/${step}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId: pdf.id }),
      })
      // Handle non-JSON responses (timeouts return HTML error pages)
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch {
        setStepStatus(s => ({ ...s, [step]: 'error' }))
        setStepResult(s => ({ ...s, [step]: res.status === 504 ? 'Timeout — probeer opnieuw' : `Server fout (${res.status})` }))
        return
      }
      if (res.ok) {
        setStepStatus(s => ({ ...s, [step]: 'done' }))
        const summary = step === 'pdf' ? `${data.chapters} hoofdstukken` :
          step === 'social' ? `${data.postsCreated} posts` :
          step === 'images' ? `${data.imagesGenerated} afbeeldingen` :
          step === 'mail' ? `${data.emailsGenerated} emails` :
          step === 'leads' ? `${data.communitiesFound} communities` : 'Klaar'
        setStepResult(s => ({ ...s, [step]: summary }))
        // Refresh page data after 2s
        setTimeout(() => router.refresh(), 2000)
      } else {
        setStepStatus(s => ({ ...s, [step]: 'error' }))
        setStepResult(s => ({ ...s, [step]: data.error || 'Mislukt' }))
      }
    } catch (err) {
      setStepStatus(s => ({ ...s, [step]: 'error' }))
      setStepResult(s => ({ ...s, [step]: String(err) }))
    }
  }

  const publishPost = async (postId: string) => {
    setPublishingId(postId)
    try {
      const res = await fetch(`/api/social/${postId}/publish`, { method: 'POST' })
      if (res.ok) setPublishedIds(prev => new Set(prev).add(postId))
    } finally {
      setPublishingId(null)
    }
  }

  const tabs = [
    { key: 'overview', label: 'Overzicht', icon: '📊' },
    { key: 'actions', label: 'Acties', icon: '⚡' },
    { key: 'images', label: 'Afbeeldingen', icon: '🖼️' },
    { key: 'social', label: `Social (${posts.length})`, icon: '📱' },
    { key: 'template', label: 'Template', icon: '📄' },
    { key: 'leads', label: `Leads (${leads.length})`, icon: '👥' },
    { key: 'emails', label: `Emails (${emailSequences.length})`, icon: '📧' },
  ]

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/pdfs" className="text-sm text-gray-400 hover:text-gray-600">← PDFs</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-600 font-medium truncate">{pdf.title}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{(pdf.pdf_ideas as any)?.niche || 'PDF'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pdf.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {pdf.active ? '🟢 Live' : '⚫ Inactief'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{pdf.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{pdf.subtitle}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <a href={`${appUrl}/${pdf.slug}`} target="_blank" className="text-sm text-indigo-600 hover:underline font-medium">
                🌐 {appUrl}/{pdf.slug} →
              </a>
              {pdf.generated_pdf_html && (
                <a href={`/dashboard/pdfs/${pdf.id}/preview`} target="_blank"
                  className="text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium px-3 py-1 rounded-lg transition">
                  📄 Bekijk PDF →
                </a>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-bold text-indigo-600">€{pdf.price}</p>
            <p className="text-sm text-gray-500 mt-1">{orders.length} bestellingen</p>
            <p className="text-sm font-semibold text-green-600">€{revenue.toFixed(2)} omzet</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          {[
            { label: 'Leads', value: leads.length, icon: '👥' },
            { label: 'Bestellingen', value: orders.length, icon: '🛒' },
            { label: 'Social posts', value: posts.length, icon: '📱' },
            { label: 'Emails klaar', value: emailSequences.length, icon: '📧' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {landing && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-4">🌐 Landingspagina Content</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Headline</p>
                  <p className="text-gray-800 font-medium">{landing.hero_headline}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Subtext</p>
                  <p className="text-gray-700 text-sm">{landing.hero_subtext}</p>
                </div>
                {landing.pain_points?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Pain points</p>
                    <ul className="space-y-1">
                      {landing.pain_points.map((p: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-red-400">✗</span>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {landing.benefits?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Benefits</p>
                    <ul className="space-y-1">
                      {landing.benefits.map((b: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-indigo-400">✓</span>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          {orders.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-4">🛒 Recente Bestellingen</h2>
              <div className="space-y-2">
                {orders.slice(0, 5).map((order: Order) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{order.customer_name}</p>
                      <p className="text-xs text-gray-400">{order.customer_email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'paid' || order.status === 'generated' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{order.status}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('nl-NL')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTIONS */}
      {activeTab === 'actions' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-1">⚡ Taken uitvoeren</h2>
          <p className="text-sm text-gray-500 mb-6">Elke taak staat op zichzelf — klik er een aan als je die content wilt genereren.</p>
          <div className="space-y-3">
            {STEPS.map(step => {
              const status = stepStatus[step.key]
              const result = stepResult[step.key]
              return (
                <div key={step.key} className={`flex items-center justify-between p-4 rounded-xl border transition ${
                  status === 'done' ? 'bg-green-50 border-green-200' :
                  status === 'error' ? 'bg-red-50 border-red-200' :
                  status === 'loading' ? 'bg-indigo-50 border-indigo-200' :
                  'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{step.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{step.label}</p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                      {result && (
                        <p className={`text-xs mt-0.5 font-medium ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}>
                          {status === 'done' ? '✓ ' : '✗ '}{result}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => runStep(step.key)}
                    disabled={status === 'loading'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                      status === 'loading' ? 'bg-indigo-400 text-white cursor-not-allowed' :
                      status === 'done' ? 'bg-green-600 text-white hover:bg-green-700' :
                      status === 'error' ? 'bg-red-600 text-white hover:bg-red-700' :
                      'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {status === 'loading' && (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {status === 'idle' && 'Uitvoeren'}
                    {status === 'loading' && 'Bezig...'}
                    {status === 'done' && 'Opnieuw'}
                    {status === 'error' && 'Opnieuw'}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-5">
            Resultaten verschijnen na uitvoeren in de bijbehorende tabs. PDF en social content verschijnen direct na genereren.
          </p>
        </div>
      )}

      {/* IMAGES */}
      {activeTab === 'images' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-1">🖼️ Gegenereerde Afbeeldingen</h2>
          <p className="text-sm text-gray-500 mb-5">Automatisch aangemaakt via Pollinations.ai (gratis) bij goedkeuren</p>

          {!images.hero_banner && !images.instagram?.length && !images.pdf_cover ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🖼️</p>
              <p className="text-sm">Geen afbeeldingen gegenereerd.</p>
              <p className="text-xs mt-1">Keur een nieuw idee goed om automatisch afbeeldingen te genereren.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hero banner */}
              {images.hero_banner && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Hero banner (1200×630) — landingspagina</p>
                  <div className="rounded-xl overflow-hidden border border-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={images.hero_banner} alt="Hero banner" className="w-full h-48 object-cover bg-gray-100" loading="lazy" />
                  </div>
                  <a href={images.hero_banner} target="_blank" className="text-xs text-indigo-500 hover:underline mt-1 inline-block">
                    Download →
                  </a>
                </div>
              )}

              {/* PDF cover */}
              {images.pdf_cover && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">PDF Cover (800×1100)</p>
                  <div className="flex gap-4 items-start">
                    <div className="rounded-xl overflow-hidden border border-gray-100 w-32 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={images.pdf_cover} alt="PDF cover" className="w-full object-cover bg-gray-100" loading="lazy" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Gebruik als voorpagina van de PDF</p>
                      <a href={images.pdf_cover} target="_blank" className="text-xs text-indigo-500 hover:underline">Download →</a>
                    </div>
                  </div>
                </div>
              )}

              {/* Instagram posts */}
              {images.instagram?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Instagram Posts (1080×1080) — {images.instagram.length} stuks</p>
                  <div className="grid grid-cols-3 gap-3">
                    {images.instagram.map((url: string, i: number) => (
                      <div key={i} className="space-y-1">
                        <div className="rounded-xl overflow-hidden border border-gray-100 aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Instagram post ${i + 1}`} className="w-full h-full object-cover bg-gray-100" loading="lazy" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{['Awareness', 'Interest', 'Conversion'][i]}</span>
                          <a href={url} target="_blank" className="text-xs text-indigo-500 hover:underline">↓</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompts used */}
              {images.prompts && (
                <details className="border border-gray-100 rounded-xl">
                  <summary className="px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer list-none flex justify-between">
                    Gebruikte AI-prompts
                    <span className="text-gray-400">+</span>
                  </summary>
                  <div className="px-4 pb-4 space-y-2">
                    {Object.entries(images.prompts).map(([key, val]) => (
                      <div key={key}>
                        <p className="text-xs font-medium text-gray-400 uppercase">{key}</p>
                        <p className="text-xs text-gray-600">{val as string}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* SOCIAL */}
      {activeTab === 'social' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">📱 Social Media Posts ({posts.length})</h2>
            <div className="text-sm text-gray-500">
              {posts.filter((p: Post) => p.status === 'published').length} gepubliceerd · {posts.filter((p: Post) => p.status === 'planned').length} gepland
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            {(['instagram', 'linkedin', 'tiktok'] as const).map(platform => (
              <button key={platform} onClick={() => setSocialPlatform(platform)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${socialPlatform === platform ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {PLATFORM_ICON[platform]} {platform} ({posts.filter((p: Post) => p.platform === platform).length})
              </button>
            ))}
          </div>
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {posts.filter((p: Post) => p.platform === socialPlatform).map((post: Post) => {
              const isPublished = post.status === 'published' || publishedIds.has(post.id)
              return (
                <div key={post.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[post.post_type] || 'bg-gray-100 text-gray-600'}`}>{post.post_type}</span>
                        <span className="text-xs text-gray-400">{new Date(post.scheduled_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                        {isPublished && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Gepubliceerd</span>}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content_text}</p>
                      {post.hashtags?.length > 0 && <p className="text-xs text-indigo-500 mt-1.5">{post.hashtags.join(' ')}</p>}
                      {post.visual_description && (
                        <p className="text-xs text-gray-400 mt-1 bg-gray-50 rounded px-2 py-1">
                          <span className="font-medium">Beeld: </span>{post.visual_description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      {!isPublished ? (
                        <button onClick={() => publishPost(post.id)} disabled={publishingId === post.id}
                          className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 font-medium whitespace-nowrap">
                          {publishingId === post.id ? '...' : 'Publiceer nu'}
                        </button>
                      ) : <span className="text-green-600 text-sm">✓</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            {posts.filter((p: Post) => p.platform === socialPlatform).length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">Geen posts voor dit platform.</p>
            )}
          </div>
        </div>
      )}

      {/* TEMPLATE */}
      {activeTab === 'template' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">📄 PDF Template</h2>
          {!template ? (
            <p className="text-gray-400 text-sm">Geen template gevonden voor deze PDF.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Niche</p><p className="text-sm text-gray-700">{template.niche}</p></div>
                <div><p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Tone of voice</p><p className="text-sm text-gray-700">{template.tone_of_voice}</p></div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Intro template</p>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">{template.intro_template}</div>
              </div>
              {template.chapters?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Hoofdstukken ({template.chapters.length})</p>
                  <div className="space-y-2">
                    {template.chapters.map((ch: any, i: number) => (
                      <div key={i} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm text-gray-800">{i + 1}. {ch.title}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0">{ch.word_count_target || '~300'} woorden</span>
                        </div>
                        <p className="text-xs text-gray-500">{ch.prompt_instructions}</p>
                        {ch.variables_used?.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {ch.variables_used.map((v: string) => (
                              <span key={v} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono">{`{${v}}`}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Outro template</p>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">{template.outro_template}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEADS */}
      {activeTab === 'leads' && (
        <div className="space-y-5">
          {/* Lead list */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-4">👥 Email Leads ({leads.length})</h2>
            {leads.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Nog geen leads. Ze worden automatisch verzameld via de landingspagina.</p>
            ) : (
              <div className="space-y-0">
                {leads.map((lead: Lead) => (
                  <div key={lead.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{lead.name || '(geen naam)'}</p>
                      <p className="text-xs text-gray-500">{lead.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{new Date(lead.created_at).toLocaleDateString('nl-NL')}</p>
                      <p className="text-xs text-gray-400">{lead.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outreach communities from lead finder */}
          {outreachData && outreachData.length > 0 ? (
            outreachData.map((entry: any, idx: number) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg">🎯 Communities & Outreach</h2>
                  <span className="text-xs text-gray-400">
                    {entry.generated_at ? new Date(entry.generated_at).toLocaleDateString('nl-NL') : ''}
                  </span>
                </div>

                {/* Quick win */}
                {entry.quick_win && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">⚡ Quick Win</p>
                    <p className="text-sm text-amber-900">{entry.quick_win}</p>
                  </div>
                )}

                {/* Hashtags */}
                {entry.hashtags?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Hashtags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.hashtags.map((tag: string, i: number) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-mono">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Communities */}
                {entry.communities?.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{entry.communities.length} communities gevonden</p>
                    {entry.communities.map((community: any, i: number) => (
                      <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-gray-700">{community.name}</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">{community.platform}</span>
                              {community.size && <span className="text-xs text-gray-400">{community.size}</span>}
                            </div>
                            {community.why_relevant && (
                              <p className="text-xs text-gray-500 mt-0.5">{community.why_relevant}</p>
                            )}
                          </div>
                          {community.url && (
                            <a href={community.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-indigo-500 hover:underline flex-shrink-0">
                              Open →
                            </a>
                          )}
                        </div>
                        {community.outreach_script && (
                          <div className="px-4 py-3">
                            <p className="text-xs font-medium text-gray-400 mb-2">Outreach bericht (klaar voor gebruik):</p>
                            <div className="bg-white border border-gray-100 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {community.outreach_script}
                            </div>
                            <button
                              onClick={() => navigator.clipboard.writeText(community.outreach_script)}
                              className="mt-2 text-xs text-indigo-500 hover:text-indigo-700"
                            >
                              📋 Kopieer
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-3">🎯 Communities & Outreach</h2>
              <p className="text-gray-400 text-sm text-center py-4">
                Geen lead data gevonden. De lead finder draait elke dinsdag en donderdag automatisch,<br/>
                of wordt getriggerd bij goedkeuring van een nieuw idee.
              </p>
            </div>
          )}
        </div>
      )}

      {/* EMAILS */}
      {activeTab === 'emails' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-2">📧 Email Sequenties</h2>
          <p className="text-sm text-gray-500 mb-5">Automatisch verstuurd via Resend op basis van triggers</p>
          {emailSequences.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Geen email sequenties gevonden.</p>
          ) : (
            <div className="space-y-3">
              {emailSequences.map((email: EmailSeq, i: number) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{email.subject}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-mono bg-white border border-gray-200 px-2 py-0.5 rounded">{email.trigger}</span>
                      {email.delay_hours > 0 && <span className="text-xs text-gray-400">na {email.delay_hours}u</span>}
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">Klaar</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-2">Trigger overzicht:</p>
            <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="bg-gray-50 rounded-lg p-3"><span className="font-mono font-medium">signup</span> — direct na aanmelding</div>
              <div className="bg-gray-50 rounded-lg p-3"><span className="font-mono font-medium">no_purchase_24h</span> — na 24u zonder aankoop</div>
              <div className="bg-gray-50 rounded-lg p-3"><span className="font-mono font-medium">no_purchase_72h</span> — na 72u zonder aankoop</div>
              <div className="bg-gray-50 rounded-lg p-3"><span className="font-mono font-medium">post_purchase_7d</span> — 7 dagen na aankoop</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
