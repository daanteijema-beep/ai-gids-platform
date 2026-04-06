import { supabaseAdmin } from '@/lib/supabase'
import IdeaCard from './IdeaCard'
import GenerateIdeasButton from './GenerateIdeasButton'

export const revalidate = 0

async function getIdeas() {
  const { data } = await supabaseAdmin
    .from('pdf_ideas')
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

export default async function IdeasPage() {
  const ideas = await getIdeas()

  const pending = ideas.filter(i => i.status === 'pending')
  const approved = ideas.filter(i => i.status === 'approved')
  const published = ideas.filter(i => i.status === 'published')
  const rejected = ideas.filter(i => i.status === 'rejected')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PDF Ideeën</h1>
          <p className="text-gray-500 mt-1">Voorgesteld door de research agent — keur goed of af</p>
        </div>
        <GenerateIdeasButton secret={process.env.CRON_SECRET || ''} />
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full inline-block"></span>
            Wacht op jouw review ({pending.length})
          </h2>
          <div className="space-y-4">
            {pending.map(idea => <IdeaCard key={idea.id} idea={idea} />)}
          </div>
        </section>
      )}

      {ideas.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">💡</p>
          <p className="text-lg mb-2">Nog geen ideeën</p>
          <p className="text-sm">Klik op "Nieuw ideeën genereren" om de research agent te starten.</p>
        </div>
      )}

      {/* Published */}
      {published.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
            Gepubliceerd ({published.length})
          </h2>
          <div className="space-y-3">
            {published.map(idea => (
              <div key={idea.id} className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800">{idea.title}</p>
                  <p className="text-sm text-green-600">{idea.niche} · €{idea.estimated_price}</p>
                </div>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">Live</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
            Afgewezen ({rejected.length})
          </h2>
          <div className="space-y-3">
            {rejected.map(idea => (
              <div key={idea.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="font-medium text-gray-500 line-through">{idea.title}</p>
                <p className="text-sm text-gray-400">{idea.niche}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
