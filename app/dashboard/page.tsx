import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 30

async function getStats() {
  const [
    { count: pendingIdeas },
    { count: totalPdfs },
    { count: totalOrders },
    { count: pendingOrders },
    { data: recentLearnings },
  ] = await Promise.all([
    supabaseAdmin.from('pdf_ideas').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('pdfs').select('*', { count: 'exact', head: true }).eq('active', true),
    supabaseAdmin.from('pdf_orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
    supabaseAdmin.from('pdf_orders').select('*', { count: 'exact', head: true }).in('status', ['paid', 'generated']),
    supabaseAdmin.from('agent_learnings').select('insight, learning_type, created_at').order('created_at', { ascending: false }).limit(3),
  ])

  return { pendingIdeas, totalPdfs, totalOrders, pendingOrders, recentLearnings }
}

export default async function DashboardPage() {
  const { pendingIdeas, totalPdfs, totalOrders, pendingOrders, recentLearnings } = await getStats()

  const stats = [
    { label: 'Wacht op review', value: pendingIdeas ?? 0, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: '💡', href: '/dashboard/ideas' },
    { label: 'Actieve PDFs', value: totalPdfs ?? 0, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', icon: '📄', href: '/dashboard/pdfs' },
    { label: 'Verkopen', value: totalOrders ?? 0, color: 'bg-green-50 border-green-200 text-green-700', icon: '✅', href: '/dashboard/orders' },
    { label: 'In verwerking', value: pendingOrders ?? 0, color: 'bg-orange-50 border-orange-200 text-orange-700', icon: '⏳', href: '/dashboard/orders' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overzicht</h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
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

      {/* Agent controls */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-lg mb-1">Research Agent</h2>
          <p className="text-gray-500 text-sm mb-4">
            Laat Claude nieuwe PDF ideeën onderzoeken en voorstellen op basis van markttrends en eerdere learnings.
          </p>
          <a
            href={`/api/agents/research?secret=${process.env.CRON_SECRET}`}
            className="inline-block bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition"
            target="_blank"
          >
            Start research run →
          </a>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-lg mb-1">Monitoring Agent</h2>
          <p className="text-gray-500 text-sm mb-4">
            Analyseer sales en bereik van alle actieve PDFs en extraheer learnings voor de research agent.
          </p>
          <a
            href={`/api/agents/monitor?secret=${process.env.CRON_SECRET}`}
            className="inline-block bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition"
            target="_blank"
          >
            Start monitoring run →
          </a>
        </div>
      </div>

      {/* Recent learnings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-bold text-lg mb-4">Recente Learnings van de Agents</h2>
        {!recentLearnings?.length ? (
          <p className="text-gray-400 text-sm">
            Nog geen learnings — start de monitoring agent om te beginnen.
          </p>
        ) : (
          <div className="space-y-3">
            {recentLearnings.map((l, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-indigo-500 mt-0.5">💡</span>
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">{l.learning_type}</span>
                  <p className="text-sm text-gray-700 mt-0.5">{l.insight}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
