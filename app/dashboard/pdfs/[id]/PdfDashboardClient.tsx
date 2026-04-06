'use client'

import { useState } from 'react'
import Link from 'next/link'

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

export default function PdfDashboardClient({ data }: { data: any }) {
  const { pdf, landing, template, posts, leads, orders, emailSequences } = data
  const [activeTab, setActiveTab] = useState<'overview' | 'social' | 'template' | 'leads' | 'emails'>('overview')
  const [socialPlatform, setSocialPlatform] = useState<'instagram' | 'linkedin' | 'tiktok'>('instagram')
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set())

  const revenue = orders.filter((o: Order) => o.status === 'paid' || o.status === 'generated' || o.status === 'delivered').length * pdf.price
  const appUrl = 'https://vakwebtwente.vercel.app'

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
    { key: 'social', label: `Social (${posts.length})`, icon: '📱' },
    { key: 'template', label: 'PDF Template', icon: '📄' },
    { key: 'leads', label: `Leads (${leads.length})`, icon: '👥' },
    { key: 'emails', label: `Emails (${emailSequences.length})`, icon: '📧' },
  ]

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/pdfs" className="text-sm text-gray-400 hover:text-gray-600">← PDFs</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-600 font-medium">{pdf.title}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{(pdf.pdf_ideas as any)?.niche || 'PDF'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pdf.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {pdf.active ? '🟢 Live' : '⚫ Inactief'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{pdf.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{pdf.subtitle}</p>
            <div className="flex items-center gap-3 mt-3">
              <a
                href={`${appUrl}/${pdf.slug}`}
                target="_blank"
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                🌐 {appUrl}/{pdf.slug} →
              </a>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-bold text-indigo-600">€{pdf.price}</p>
            <p className="text-sm text-gray-500 mt-1">{orders.length} bestellingen</p>
            <p className="text-sm font-semibold text-green-600">€{revenue.toFixed(2)} omzet</p>
          </div>
        </div>

        {/* Quick stats */}
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
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Landing page content preview */}
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
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Pain points ({landing.pain_points.length})</p>
                    <ul className="space-y-1">
                      {landing.pain_points.map((p: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-red-400">✗</span>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {landing.benefits?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Benefits ({landing.benefits.length})</p>
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

          {/* Recent orders */}
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

      {/* Social tab */}
      {activeTab === 'social' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">📱 Social Media Posts ({posts.length})</h2>
            <div className="text-sm text-gray-500">
              {posts.filter((p: Post) => p.status === 'published').length} gepubliceerd · {posts.filter((p: Post) => p.status === 'planned').length} gepland
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {(['instagram', 'linkedin', 'tiktok'] as const).map(platform => {
              const count = posts.filter((p: Post) => p.platform === platform).length
              return (
                <button key={platform} onClick={() => setSocialPlatform(platform)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${socialPlatform === platform ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {PLATFORM_ICON[platform]} {platform} ({count})
                </button>
              )
            })}
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
                      {post.hashtags?.length > 0 && (
                        <p className="text-xs text-indigo-500 mt-1.5">{post.hashtags.join(' ')}</p>
                      )}
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
                      ) : <span className="text-green-600">✓</span>}
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

      {/* Template tab */}
      {activeTab === 'template' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">📄 PDF Template</h2>
          {!template ? (
            <p className="text-gray-400 text-sm">Geen template gevonden voor deze PDF.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Niche</p>
                  <p className="text-sm text-gray-700">{template.niche}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Tone of voice</p>
                  <p className="text-sm text-gray-700">{template.tone_of_voice}</p>
                </div>
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
                        <div className="flex items-start justify-between gap-2 mb-2">
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

      {/* Leads tab */}
      {activeTab === 'leads' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">👥 Leads ({leads.length})</h2>
          {leads.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Nog geen leads voor deze PDF. Ze worden automatisch verzameld via de landingspagina.</p>
          ) : (
            <div className="space-y-2">
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
      )}

      {/* Emails tab */}
      {activeTab === 'emails' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-2">📧 Email Sequenties</h2>
          <p className="text-sm text-gray-500 mb-5">Automatisch verstuurd via Resend op basis van trigger events</p>
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
                      {email.delay_hours > 0 && <span className="text-xs text-gray-400">na {email.delay_hours} uur</span>}
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">Klaar</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-2">Outreach triggers:</p>
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
