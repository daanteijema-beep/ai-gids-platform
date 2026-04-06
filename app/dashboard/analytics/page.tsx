import { supabaseAdmin } from '@/lib/supabase'
import RunProtectedActionButton from '../RunProtectedActionButton'

export const revalidate = 60

async function getAnalytics() {
  const [
    { data: pdfs },
    { data: orders },
    { data: leads },
    { data: learnings },
  ] = await Promise.all([
    supabaseAdmin.from('pdfs').select('id, title, price, slug, active, created_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('pdf_orders').select('id, pdf_id, status, created_at'),
    supabaseAdmin.from('leads').select('id, created_at, pdf_id').order('created_at', { ascending: false }).limit(1000),
    supabaseAdmin.from('agent_learnings').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  const pdfStats = (pdfs || []).map((pdf) => {
    const pdfOrders = (orders || []).filter((o) => o.pdf_id === pdf.id)
    const sold = pdfOrders.filter((o) => o.status === 'delivered').length
    const pdfLeads = (leads || []).filter((l) => l.pdf_id === pdf.id).length
    const daysLive = Math.max(1, Math.floor((Date.now() - new Date(pdf.created_at).getTime()) / (1000 * 60 * 60 * 24)))

    return {
      ...pdf,
      sold,
      revenue: sold * pdf.price,
      leads: pdfLeads,
      conversion: pdfLeads > 0 ? ((sold / pdfLeads) * 100).toFixed(1) : '0',
      salesPerDay: (sold / daysLive).toFixed(2),
      daysLive,
    }
  })

  const totalRevenue = pdfStats.reduce((sum, pdf) => sum + pdf.revenue, 0)
  const totalSold = pdfStats.reduce((sum, pdf) => sum + pdf.sold, 0)
  const totalLeads = (leads || []).length

  const weeklyRevenue: Record<string, number> = {}
  for (const order of (orders || []).filter((o) => o.status === 'delivered')) {
    const week = getWeekLabel(new Date(order.created_at))
    const pdf = pdfs?.find((p) => p.id === order.pdf_id)
    weeklyRevenue[week] = (weeklyRevenue[week] || 0) + (pdf?.price || 0)
  }

  const learningsByType: Record<string, typeof learnings> = {}
  for (const learning of learnings || []) {
    if (!learningsByType[learning.learning_type]) {
      learningsByType[learning.learning_type] = []
    }
    learningsByType[learning.learning_type]!.push(learning)
  }

  return { pdfStats, totalRevenue, totalSold, totalLeads, weeklyRevenue, learningsByType }
}

function getWeekLabel(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

const LEARNING_TYPE_LABELS: Record<string, string> = {
  research_focus: 'Research focus',
  content_strategy: 'Content strategie',
  outreach_strategy: 'Outreach',
  price_sensitivity: 'Prijs',
  niche_performance: 'Niche performance',
  general: 'Algemeen',
}

export default async function AnalyticsPage() {
  const { pdfStats, totalRevenue, totalSold, totalLeads, weeklyRevenue, learningsByType } = await getAnalytics()

  const weeks = Object.entries(weeklyRevenue).slice(-8)
  const maxWeekRevenue = Math.max(...weeks.map(([, value]) => value), 1)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Overzicht van alle PDFs, sales en agent learnings</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm text-green-600 font-medium mb-1">Totale omzet</p>
          <p className="text-3xl font-bold text-green-700">EUR {totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <p className="text-sm text-indigo-600 font-medium mb-1">Verkopen</p>
          <p className="text-3xl font-bold text-indigo-700">{totalSold}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <p className="text-sm text-purple-600 font-medium mb-1">Leads</p>
          <p className="text-3xl font-bold text-purple-700">{totalLeads}</p>
        </div>
      </div>

      {weeks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="font-bold text-lg mb-4">Omzet per week</h2>
          <div className="flex items-end gap-2 h-32">
            {weeks.map(([week, revenue]) => (
              <div key={week} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">EUR {revenue}</span>
                <div
                  className="w-full bg-indigo-500 rounded-t"
                  style={{ height: `${(revenue / maxWeekRevenue) * 96}px`, minHeight: revenue > 0 ? '4px' : '0' }}
                />
                <span className="text-xs text-gray-400 text-center leading-tight">{week}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-lg">Prestaties per PDF</h2>
        </div>
        {pdfStats.length === 0 ? (
          <p className="text-gray-400 text-sm p-5">Nog geen PDFs gepubliceerd.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">PDF</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Prijs</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Leads</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Verkopen</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Conversie</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Omzet</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Sales/dag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pdfStats.map((pdf) => (
                <tr key={pdf.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pdf.active ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <div>
                        <p className="font-medium text-gray-900 text-xs leading-snug">{pdf.title}</p>
                        <p className="text-gray-400 text-xs">{pdf.daysLive} dagen live</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">EUR {pdf.price}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{pdf.leads}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-900">{pdf.sold}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        Number(pdf.conversion) >= 10
                          ? 'bg-green-100 text-green-700'
                          : Number(pdf.conversion) >= 3
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {pdf.conversion}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-green-600">EUR {pdf.revenue.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{pdf.salesPerDay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Wat de agents hebben geleerd</h2>
          <RunProtectedActionButton endpoint="/api/agents/orchestrate" label="Run orchestrator" successLabel="Opnieuw draaien" />
        </div>

        {Object.keys(learningsByType).length === 0 ? (
          <p className="text-gray-400 text-sm">Nog geen learnings. Run de orchestrator agent.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(learningsByType).map(([type, items]) => (
              <div key={type}>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">{LEARNING_TYPE_LABELS[type] || type}</h3>
                <div className="space-y-2">
                  {items!.slice(0, 3).map((learning, index) => (
                    <div key={index} className="text-sm bg-gray-50 rounded-lg px-4 py-2.5 text-gray-700">
                      {learning.insight}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
