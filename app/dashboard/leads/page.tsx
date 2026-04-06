import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 30

async function getLeads() {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('*, pdfs(title)')
    .order('created_at', { ascending: false })
    .limit(200)
  return data || []
}

export default async function LeadsPage() {
  const leads = await getLeads()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-gray-500 mt-1">{leads.length} leads verzameld</p>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">👥</p>
          <p className="text-lg">Nog geen leads</p>
          <p className="text-sm mt-1">Leads worden verzameld wanneer bezoekers hun email achterlaten op een landingspagina.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Naam</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Interesse in</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bron</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{lead.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{lead.email}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{lead.pdfs?.title?.slice(0, 40) || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{lead.source}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(lead.created_at).toLocaleDateString('nl-NL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
