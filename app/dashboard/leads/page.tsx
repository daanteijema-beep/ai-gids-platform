import { supabaseAdmin } from '@/lib/supabase'
import type { Lead } from '@/lib/supabase'

export const revalidate = 30

async function getLeads() {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('*, niches(naam, icon)')
    .order('created_at', { ascending: false })
    .limit(500)
  return (data || []) as Lead[]
}

const STATUS_COLORS: Record<string, string> = {
  nieuw: 'bg-blue-50 text-blue-700 border-blue-200',
  gebeld: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  demo: 'bg-purple-50 text-purple-700 border-purple-200',
  klant: 'bg-green-50 text-green-700 border-green-200',
  afgewezen: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  nieuw: 'Nieuw',
  gebeld: 'Gebeld',
  demo: 'Demo',
  klant: 'Klant ✓',
  afgewezen: 'Afgewezen',
}

export default async function LeadsPage() {
  const leads = await getLeads()
  const nieuw = leads.filter(l => l.status === 'nieuw').length
  const klanten = leads.filter(l => l.status === 'klant').length

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">{leads.length} totaal · {nieuw} nieuw · {klanten} klant</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {Object.entries(STATUS_LABELS).map(([key, label]) => {
          const count = leads.filter(l => l.status === key).length
          return (
            <div key={key} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${STATUS_COLORS[key]}`}>
              {label} ({count})
            </div>
          )
        })}
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">👥</p>
          <p className="text-lg font-medium">Nog geen leads</p>
          <p className="text-sm mt-2">Leads komen binnen via het contactformulier of de aanvraagflow.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Naam / Bedrijf</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sector</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bron</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => {
                const niche = lead.niches as { naam: string; icon: string } | undefined
                return (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{lead.naam}</div>
                      {lead.bedrijf && <div className="text-xs text-gray-400">{lead.bedrijf}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{lead.telefoon}</div>
                      {lead.email && <div className="text-xs text-gray-400">{lead.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {niche ? `${niche.icon} ${niche.naam}` : lead.sector || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{lead.bron}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[lead.status]}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(lead.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
