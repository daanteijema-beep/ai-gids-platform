import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 30

async function getStats() {
  const [
    { count: nieuweLeads },
    { count: totalLeads },
    { count: emailsKlaar },
    { count: emailsVerstuurd },
    { count: totalKlanten },
    { count: pipelineRuns },
    { count: activeRuns },
    { data: recentLeads },
    { data: recentEmails },
    { data: recentContent },
    { data: latestInsights },
  ] = await Promise.all([
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'nieuw'),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('outreach_queue').select('*', { count: 'exact', head: true }).eq('status', 'wacht_op_goedkeuring'),
    supabaseAdmin.from('outreach_queue').select('*', { count: 'exact', head: true }).eq('status', 'verstuurd'),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'klant'),
    supabaseAdmin.from('pipeline_runs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('pipeline_runs').select('*', { count: 'exact', head: true }).eq('status', 'running'),
    supabaseAdmin.from('leads').select('naam, bedrijf, sector, status, created_at, bron').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('outreach_queue').select('aan_bedrijf, onderwerp, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('marketing_content').select('type, titel, created_at, niches(naam, icon)').order('created_at', { ascending: false }).limit(4),
    supabaseAdmin.from('content_insights').select('aanbevolen_hook, week, niches(naam, icon)').not('aanbevolen_hook', 'is', null).order('created_at', { ascending: false }).limit(3),
  ])

  return { nieuweLeads, totalLeads, emailsKlaar, emailsVerstuurd, totalKlanten, pipelineRuns, activeRuns, recentLeads, recentEmails, recentContent, latestInsights }
}

const LEAD_STATUS: Record<string, { label: string; color: string }> = {
  nieuw: { label: 'Nieuw', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  gebeld: { label: 'Gebeld', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  demo: { label: 'Demo', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  klant: { label: 'Klant', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  afgewezen: { label: 'Afgewezen', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const EMAIL_STATUS: Record<string, { label: string; color: string }> = {
  wacht_op_goedkeuring: { label: 'Klaar', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  verstuurd: { label: 'Verstuurd', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  afgewezen: { label: 'Overgeslagen', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

const TYPE_ICON: Record<string, string> = {
  linkedin_posts: '💼', instagram_posts: '📸', cold_email_sequence: '📧',
  landing_page_copy: '🌐', whatsapp_script: '💬', trend_analyse: '📊',
}

function StatCard({ value, label, icon, href, accent, badge }: {
  value: number | string; label: string; icon: string; href: string; accent: string; badge?: string
}) {
  return (
    <Link href={href} className="group relative bg-white rounded-2xl border border-slate-200/80 p-6 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 transition-all overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accent} rounded-t-2xl`} />
      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        {badge && <span className="text-[10px] font-bold bg-orange-500/15 text-orange-500 px-1.5 py-0.5 rounded-md">{badge}</span>}
      </div>
      <div className="text-4xl font-bold text-slate-900 mb-1.5 tracking-tight">{value}</div>
      <div className="text-[13px] font-medium text-slate-500">{label}</div>
    </Link>
  )
}

export default async function DashboardPage() {
  const { nieuweLeads, totalLeads, emailsKlaar, emailsVerstuurd, totalKlanten, pipelineRuns, activeRuns, recentLeads, recentEmails, recentContent, latestInsights } = await getStats()

  const date = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond'

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-[13px] font-medium text-slate-400 mb-1 uppercase tracking-wider">{date}</p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{greeting}</h1>
          <p className="text-slate-500 mt-1.5 text-[15px]">Hier is je dagelijks overzicht van VakwebTwente.</p>
        </div>
        <div className="flex items-center gap-3">
          {(activeRuns ?? 0) > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2.5 rounded-xl text-sm font-semibold">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              {activeRuns} pipeline actief
            </div>
          )}
          {(totalKlanten ?? 0) > 0 && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-semibold">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              {totalKlanten} klant{(totalKlanten ?? 0) !== 1 ? 'en' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard value={nieuweLeads ?? 0} label="Nieuwe leads" icon="🔔" href="/dashboard/leads" accent="bg-blue-500" badge={(nieuweLeads ?? 0) > 0 ? 'Nieuw' : undefined} />
        <StatCard value={totalLeads ?? 0} label="Totaal leads" icon="👥" href="/dashboard/leads" accent="bg-slate-400" />
        <StatCard value={emailsKlaar ?? 0} label="Emails klaar" icon="📬" href="/dashboard/outreach" accent="bg-orange-500" badge={(emailsKlaar ?? 0) > 0 ? 'Te sturen' : undefined} />
        <StatCard value={emailsVerstuurd ?? 0} label="Verstuurd" icon="📤" href="/dashboard/outreach" accent="bg-green-500" />
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard/pipeline" className="group flex items-center gap-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 hover:from-orange-400 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/20">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-xl shrink-0">🚀</div>
          <div>
            <div className="font-bold text-white text-[15px]">Pipeline starten</div>
            <div className="text-orange-100 text-[13px] mt-0.5">{pipelineRuns} runs uitgevoerd</div>
          </div>
          <svg className="w-4 h-4 text-orange-200 ml-auto group-hover:translate-x-0.5 transition-transform shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link href="/dashboard/content-calendar" className="group flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all">
          <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-xl shrink-0">📅</div>
          <div>
            <div className="font-bold text-slate-900 text-[15px]">Content kalender</div>
            <div className="text-slate-500 text-[13px] mt-0.5">Posts voor komende weken</div>
          </div>
          <svg className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link href="/dashboard/outreach" className="group flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all">
          <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-xl shrink-0">📧</div>
          <div>
            <div className="font-bold text-slate-900 text-[15px]">Outreach emails</div>
            <div className="text-slate-500 text-[13px] mt-0.5">{emailsKlaar} klaar om te sturen</div>
          </div>
          <svg className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Trend hooks */}
      {latestInsights && latestInsights.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Trending deze week</div>
              <div className="text-white font-bold text-[15px]">Aanbevolen content hooks</div>
            </div>
            <Link href="/dashboard/marketing" className="text-xs text-orange-400 font-medium hover:text-orange-300 transition">
              Alle trends →
            </Link>
          </div>
          <div className="space-y-3">
            {(latestInsights as Array<{ aanbevolen_hook: string; week: string; niches?: { naam: string; icon: string } }>).map((insight, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-orange-500 font-bold text-sm shrink-0 mt-0.5">{i + 1}.</span>
                <div>
                  <p className="text-white text-sm leading-relaxed">&quot;{insight.aanbevolen_hook}&quot;</p>
                  {insight.niches && <span className="text-xs text-slate-400">{insight.niches.icon} {insight.niches.naam}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      <div className="grid md:grid-cols-2 gap-5 mb-6">
        {/* Recente leads */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-[15px]">Recente leads</h2>
            <Link href="/dashboard/leads" className="text-[13px] font-medium text-orange-500 hover:text-orange-600">Alles →</Link>
          </div>
          {!recentLeads?.length ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">Nog geen leads.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentLeads.map((l: Record<string, string>, i: number) => (
                <div key={i} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-slate-500">
                      {(l.naam || l.bedrijf || '?')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[13px] text-slate-900 truncate">{l.naam}</div>
                      <div className="text-[12px] text-slate-400 truncate">{l.bedrijf || l.sector || l.bron}</div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${LEAD_STATUS[l.status]?.color || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {LEAD_STATUS[l.status]?.label || l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outreach queue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-[15px]">Outreach emails</h2>
            <Link href="/dashboard/outreach" className="text-[13px] font-medium text-orange-500 hover:text-orange-600">Alles →</Link>
          </div>
          {!recentEmails?.length ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">Nog geen emails — start de pipeline.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentEmails.map((e: Record<string, string>, i: number) => (
                <div key={i} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-slate-500">
                      {(e.aan_bedrijf || '?')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[13px] text-slate-900 truncate">{e.aan_bedrijf}</div>
                      <div className="text-[12px] text-slate-400 truncate">{e.onderwerp}</div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${EMAIL_STATUS[e.status]?.color || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {EMAIL_STATUS[e.status]?.label || e.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent content */}
      {recentContent && recentContent.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-[15px]">Laatste gegenereerde content</h2>
            <Link href="/dashboard/content-calendar" className="text-[13px] font-medium text-orange-500 hover:text-orange-600">Kalender →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-slate-50">
            {(recentContent as Array<Record<string, unknown>>).map((c, i) => (
              <Link key={i} href="/dashboard/content-calendar" className="p-4 hover:bg-slate-50 transition-colors">
                <div className="text-2xl mb-2">{TYPE_ICON[c.type as string] || '📄'}</div>
                <div className="text-xs font-semibold text-slate-500 mb-1">{String(c.type || '').replace(/_/g, ' ')}</div>
                <div className="text-xs text-slate-400 truncate">
                  {(c.niches as Record<string, string>)?.icon} {(c.niches as Record<string, string>)?.naam}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
