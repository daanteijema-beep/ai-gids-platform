import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 30

async function getStats() {
  const [
    { count: nieuweLeads },
    { count: totalLeads },
    { count: outreachVerzonden },
    { count: outreachGereageerd },
    { count: totalKlanten },
    { count: pipelineRuns },
    { data: recentLeads },
    { data: recentOutreach },
  ] = await Promise.all([
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'nieuw'),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('outreach_targets').select('*', { count: 'exact', head: true }).eq('status', 'mail_verstuurd'),
    supabaseAdmin.from('outreach_targets').select('*', { count: 'exact', head: true }).eq('status', 'gereageerd'),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'klant'),
    supabaseAdmin.from('pipeline_runs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('leads').select('naam, bedrijf, sector, status, created_at, bron').order('created_at', { ascending: false }).limit(6),
    supabaseAdmin.from('outreach_targets').select('bedrijfsnaam, sector, plaats, status, created_at').order('created_at', { ascending: false }).limit(6),
  ])

  return { nieuweLeads, totalLeads, outreachVerzonden, outreachGereageerd, totalKlanten, pipelineRuns, recentLeads, recentOutreach }
}

const LEAD_STATUS: Record<string, { label: string; color: string }> = {
  nieuw:        { label: 'Nieuw',     color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  gebeld:       { label: 'Gebeld',    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  demo:         { label: 'Demo',      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  klant:        { label: 'Klant',     color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  afgewezen:    { label: 'Afgewezen', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  mail_verstuurd: { label: 'Mail',    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  gereageerd:   { label: 'Reactie',   color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  gevonden:     { label: 'Gevonden',  color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  demo_gepland: { label: 'Demo',      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
}

function StatusBadge({ status }: { status: string }) {
  const s = LEAD_STATUS[status] || { label: status, color: 'bg-slate-100 text-slate-500 border-slate-200' }
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${s.color}`}>
      {s.label}
    </span>
  )
}

function StatCard({ value, label, icon, href, accent }: {
  value: number | string; label: string; icon: string; href: string; accent: string
}) {
  return (
    <Link href={href} className="group relative bg-white rounded-2xl border border-slate-200/80 p-6 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 transition-all overflow-hidden">
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accent} rounded-t-2xl`} />
      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
        </svg>
      </div>
      <div className="text-4xl font-bold text-slate-900 mb-1.5 tracking-tight">{value}</div>
      <div className="text-[13px] font-medium text-slate-500">{label}</div>
    </Link>
  )
}

export default async function DashboardPage() {
  const { nieuweLeads, totalLeads, outreachVerzonden, outreachGereageerd, totalKlanten, pipelineRuns, recentLeads, recentOutreach } = await getStats()

  const date = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond'

  return (
    <div className="p-8 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-[13px] font-medium text-slate-400 mb-1 uppercase tracking-wider">{date}</p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{greeting} 👋</h1>
          <p className="text-slate-500 mt-1.5 text-[15px]">Hier is je dagelijks overzicht van VakwebTwente.</p>
        </div>
        {(totalKlanten ?? 0) > 0 && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            {totalKlanten} actieve klant{(totalKlanten ?? 0) !== 1 ? 'en' : ''}
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard value={nieuweLeads ?? 0} label="Nieuwe leads" icon="🔔" href="/dashboard/leads" accent="bg-blue-500" />
        <StatCard value={totalLeads ?? 0} label="Totaal leads" icon="👥" href="/dashboard/leads" accent="bg-slate-400" />
        <StatCard value={outreachVerzonden ?? 0} label="Emails verzonden" icon="📤" href="/dashboard/outreach" accent="bg-orange-500" />
        <StatCard value={outreachGereageerd ?? 0} label="Reacties" icon="💬" href="/dashboard/outreach" accent="bg-green-500" />
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard/pipeline" className="group flex items-center gap-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 hover:from-orange-400 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/20">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-xl shrink-0">🚀</div>
          <div>
            <div className="font-bold text-white text-[15px]">Pipeline starten</div>
            <div className="text-orange-100 text-[13px] mt-0.5">AI zoekt ideeën en leads</div>
          </div>
          <svg className="w-4 h-4 text-orange-200 ml-auto group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link href="/dashboard/outreach" className="group flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all">
          <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-xl shrink-0">🎯</div>
          <div>
            <div className="font-bold text-slate-900 text-[15px]">Outreach bekijken</div>
            <div className="text-slate-500 text-[13px] mt-0.5">Emails + reacties</div>
          </div>
          <svg className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link href="/dashboard/leads" className="group flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all">
          <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-xl shrink-0">👥</div>
          <div>
            <div className="font-bold text-slate-900 text-[15px]">Leads beheren</div>
            <div className="text-slate-500 text-[13px] mt-0.5">Inbound aanvragen</div>
          </div>
          <svg className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Pipeline stat */}
      {(pipelineRuns ?? 0) > 0 && (
        <div className="bg-slate-900 rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <span className="text-orange-400 text-lg">⚡</span>
            </div>
            <div>
              <div className="font-semibold text-white text-[15px]">{pipelineRuns} pipeline run{(pipelineRuns ?? 0) !== 1 ? 's' : ''} uitgevoerd</div>
              <div className="text-slate-400 text-[13px] mt-0.5">AI heeft automatisch marktonderzoek en outreach gedaan</div>
            </div>
          </div>
          <Link href="/dashboard/pipeline" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0">
            Bekijk →
          </Link>
        </div>
      )}

      {/* Activity tables */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Recente leads */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-[15px]">Recente leads</h2>
            <Link href="/dashboard/leads" className="text-[13px] font-medium text-orange-500 hover:text-orange-600 transition-colors">
              Alles →
            </Link>
          </div>
          {!recentLeads?.length ? (
            <div className="px-6 py-12 text-center">
              <div className="text-3xl mb-3">📭</div>
              <p className="text-slate-400 text-sm">Nog geen leads. Start de pipeline om automatisch leads te vinden.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentLeads.map((l: Record<string, string>, i: number) => (
                <div key={i} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-slate-500">
                      {(l.naam || l.bedrijf || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[13px] text-slate-900 truncate">{l.naam}</div>
                      <div className="text-[12px] text-slate-400 truncate">{l.bedrijf || l.sector || l.bron}</div>
                    </div>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outreach pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-[15px]">Outreach pipeline</h2>
            <Link href="/dashboard/outreach" className="text-[13px] font-medium text-orange-500 hover:text-orange-600 transition-colors">
              Alles →
            </Link>
          </div>
          {!recentOutreach?.length ? (
            <div className="px-6 py-12 text-center">
              <div className="text-3xl mb-3">📨</div>
              <p className="text-slate-400 text-sm">Nog geen outreach. Start de pipeline om emails klaar te zetten.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentOutreach.map((t: Record<string, string>, i: number) => (
                <div key={i} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-slate-500">
                      {(t.bedrijfsnaam || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[13px] text-slate-900 truncate">{t.bedrijfsnaam}</div>
                      <div className="text-[12px] text-slate-400 truncate">{t.sector} · {t.plaats}</div>
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
