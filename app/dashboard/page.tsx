import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 30

async function getStats() {
  const [
    { count: nieuweleads },
    { count: totalLeads },
    { count: outreachVerzonden },
    { count: outreachGereageerd },
    { count: totalKlanten },
    { data: recentLeads },
    { data: recentOutreach },
  ] = await Promise.all([
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'nieuw'),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('outreach_targets').select('*', { count: 'exact', head: true }).eq('status', 'mail_verstuurd'),
    supabaseAdmin.from('outreach_targets').select('*', { count: 'exact', head: true }).eq('status', 'gereageerd'),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'klant'),
    supabaseAdmin.from('leads').select('naam, bedrijf, sector, status, created_at, bron').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('outreach_targets').select('bedrijfsnaam, sector, plaats, status, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  return { nieuweleads, totalLeads, outreachVerzonden, outreachGereageerd, totalKlanten, recentLeads, recentOutreach }
}

const STATUS_COLORS: Record<string, string> = {
  nieuw: 'bg-blue-50 text-blue-700',
  gebeld: 'bg-yellow-50 text-yellow-700',
  demo: 'bg-purple-50 text-purple-700',
  klant: 'bg-green-50 text-green-700',
  afgewezen: 'bg-red-50 text-red-700',
  gevonden: 'bg-slate-50 text-slate-600',
  mail_verstuurd: 'bg-blue-50 text-blue-700',
  gereageerd: 'bg-orange-50 text-orange-700',
  demo_gepland: 'bg-purple-50 text-purple-700',
}

export default async function DashboardPage() {
  const { nieuweleads, totalLeads, outreachVerzonden, outreachGereageerd, totalKlanten, recentLeads, recentOutreach } = await getStats()

  const stats = [
    { label: 'Nieuwe leads', value: nieuweleads ?? 0, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🔔', href: '/dashboard/leads' },
    { label: 'Totaal leads', value: totalLeads ?? 0, color: 'bg-slate-50 border-slate-200 text-slate-700', icon: '👥', href: '/dashboard/leads' },
    { label: 'Outreach verzonden', value: outreachVerzonden ?? 0, color: 'bg-orange-50 border-orange-200 text-orange-700', icon: '📤', href: '/dashboard/outreach' },
    { label: 'Reacties ontvangen', value: outreachGereageerd ?? 0, color: 'bg-green-50 border-green-200 text-green-700', icon: '✅', href: '/dashboard/outreach' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overzicht</h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {totalKlanten !== null && totalKlanten > 0 && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
            🏆 {totalKlanten} klant{totalKlanten !== 1 ? 'en' : ''}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, color, icon, href }) => (
          <Link key={label} href={href} className={`border rounded-xl p-5 ${color} hover:shadow-sm transition`}>
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-3xl font-bold mb-1">{value}</div>
            <div className="text-sm font-medium">{label}</div>
          </Link>
        ))}
      </div>

      {/* Snelle acties */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/dashboard/outreach"
          className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-sm transition group"
        >
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-orange-100 transition">🎯</div>
          <div>
            <div className="font-semibold text-slate-900">Outreach starten</div>
            <div className="text-sm text-slate-500">AI vindt vakbedrijven en mailt ze</div>
          </div>
        </Link>
        <Link
          href="/dashboard/marketing"
          className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-sm transition group"
        >
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-orange-100 transition">📱</div>
          <div>
            <div className="font-semibold text-slate-900">Marketing genereren</div>
            <div className="text-sm text-slate-500">Emails + posts per niche</div>
          </div>
        </Link>
        <Link
          href="/dashboard/leads"
          className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-sm transition group"
        >
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-orange-100 transition">👥</div>
          <div>
            <div className="font-semibold text-slate-900">Leads bekijken</div>
            <div className="text-sm text-slate-500">Inbound aanvragen</div>
          </div>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recente leads */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Recente leads</h2>
            <Link href="/dashboard/leads" className="text-sm text-orange-500 hover:underline">Alle leads →</Link>
          </div>
          {!recentLeads?.length ? (
            <p className="text-gray-400 text-sm text-center py-8">Nog geen leads — activeer de outreach agent of deel de landingspagina.</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((l: Record<string, string>, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{l.naam}</div>
                    <div className="text-xs text-slate-500">{l.bedrijf || l.sector || '—'} · {l.bron}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[l.status] || 'bg-gray-50 text-gray-600'}`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recente outreach */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Outreach pipeline</h2>
            <Link href="/dashboard/outreach" className="text-sm text-orange-500 hover:underline">Alles bekijken →</Link>
          </div>
          {!recentOutreach?.length ? (
            <p className="text-gray-400 text-sm text-center py-8">Nog geen outreach — start de agent via de Outreach pagina.</p>
          ) : (
            <div className="space-y-3">
              {recentOutreach.map((t: Record<string, string>, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{t.bedrijfsnaam}</div>
                    <div className="text-xs text-slate-500">{t.sector} · {t.plaats}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-gray-50 text-gray-600'}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
