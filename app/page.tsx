import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 60

async function getPdfs() {
  const { data } = await supabaseAdmin
    .from('pdfs')
    .select('id, title, subtitle, price, slug, description')
    .eq('active', true)
    .order('created_at', { ascending: false })
  return data || []
}

export default async function HomePage() {
  const pdfs = await getPdfs()

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-indigo-200 font-medium mb-3 uppercase tracking-widest text-sm">Voor kleine ondernemers in Nederland</p>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            AI die werkt voor<br />jouw bedrijf
          </h1>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Persoonlijke stap-voor-stap gidsen die jou leren hoe je AI inzet voor meer klanten, meer omzet, en minder gedoe — op maat gemaakt voor jouw specifieke situatie.
          </p>
          <a href="#gidsen" className="bg-white text-indigo-700 font-bold px-8 py-4 rounded-full hover:bg-indigo-50 transition inline-block">
            Bekijk alle gidsen →
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Zo werkt het</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Kies je gids', desc: 'Kies de gids die bij jouw sector en uitdaging past.' },
              { step: '2', title: 'Vertel je situatie', desc: 'Beantwoord 4–5 korte vragen over jouw bedrijf, klanten en kanalen.' },
              { step: '3', title: 'Ontvang jouw PDF', desc: 'Claude AI schrijft een volledig persoonlijk stappenplan voor jou. Direct in je inbox.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">{step}</div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PDF Grid */}
      <section id="gidsen" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Alle AI-gidsen</h2>
          <p className="text-center text-gray-500 mb-12">Elk persoonlijk gemaakt voor jouw situatie. Vanaf €9.</p>

          {pdfs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-6xl mb-4">📄</p>
              <p className="text-xl">Binnenkort beschikbaar — eerste gidsen worden gemaakt!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pdfs.map((pdf) => (
                <Link
                  key={pdf.id}
                  href={`/${pdf.slug}`}
                  className="border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-lg transition group"
                >
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition">
                    <span className="text-2xl">📄</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 leading-snug">{pdf.title}</h3>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{pdf.subtitle}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-indigo-600">€{pdf.price}</span>
                    <span className="text-sm text-indigo-600 font-medium group-hover:underline">Bekijk →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 px-6 bg-indigo-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Waarom kleine ondernemers kiezen voor onze gidsen</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🎯', title: '100% persoonlijk', desc: 'Geen generieke tips. Jouw gids is geschreven voor jouw situatie.' },
              { icon: '⚡', title: 'Direct in je inbox', desc: 'Binnen 5 minuten na betaling ontvang je jouw persoonlijke PDF.' },
              { icon: '🤝', title: 'Niet tevreden? Geld terug', desc: 'Vind je jouw gids niet nuttig? We storten het terug.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="font-bold mb-2">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-100 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} AI Gids voor Ondernemers · <Link href="/privacy" className="hover:text-gray-600">Privacy</Link></p>
      </footer>
    </main>
  )
}
