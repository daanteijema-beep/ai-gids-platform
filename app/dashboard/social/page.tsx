import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 30

async function getPosts() {
  const { data } = await supabaseAdmin
    .from('social_posts')
    .select('*, pdfs(title)')
    .order('scheduled_date', { ascending: true })
    .limit(100)
  return data || []
}

const PLATFORM_ICON: Record<string, string> = {
  instagram: '📸',
  linkedin: '💼',
  tiktok: '🎵',
}

const TYPE_COLOR: Record<string, string> = {
  awareness: 'bg-blue-100 text-blue-700',
  interest: 'bg-yellow-100 text-yellow-700',
  conversion: 'bg-green-100 text-green-700',
}

export default async function SocialPage() {
  const posts = await getPosts()

  const planned = posts.filter(p => p.status === 'planned')
  const published = posts.filter(p => p.status === 'published')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Social Media Kalender</h1>
        <p className="text-gray-500 mt-1">{planned.length} geplande posts · {published.length} gepubliceerd</p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📱</p>
          <p className="text-lg mb-2">Nog geen social posts</p>
          <p className="text-sm">Posts worden automatisch aangemaakt wanneer een PDF wordt gepubliceerd.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{PLATFORM_ICON[post.platform] || '📱'}</span>
                    <span className="text-sm font-medium capitalize text-gray-700">{post.platform}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[post.post_type] || 'bg-gray-100 text-gray-600'}`}>
                      {post.post_type}
                    </span>
                    {post.status === 'published' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Gepubliceerd</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content_text}</p>
                  {post.hashtags?.length > 0 && (
                    <p className="text-xs text-indigo-500 mt-2">{post.hashtags.join(' ')}</p>
                  )}
                  {post.visual_description && (
                    <div className="mt-2 text-xs text-gray-400 bg-gray-50 rounded p-2">
                      <span className="font-medium">Beeld:</span> {post.visual_description}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(post.scheduled_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{post.pdfs?.title?.slice(0, 30)}...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
