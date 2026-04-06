import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ToolsCheckoutButton from './ToolsCheckoutButton'

type Props = { params: Promise<{ slug: string }> }

type Feature = { icon: string; titel: string; tekst: string }
type FaqItem = { vraag: string; antwoord: string }
type SociaalBewijs = { naam: string; citaat: string; functie: string }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data } = await supabaseAdmin.from('landing_pages').select('hero_headline, meta_title, meta_description').eq('slug', slug).single()
  if (!data) return { title: 'Tool' }
  return {
    title: data.meta_title || data.hero_headline,
    description: data.meta_description || '',
  }
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params
  const { data: page } = await supabaseAdmin
    .from('landing_pages')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!page) notFound()

  const features = (page.features as Feature[]) || []
  const voordelen = (page.voordelen as string[]) || []
  const faq = (page.faq as FaqItem[]) || []
  const sociaalBewijs = page.sociaal_bewijs as SociaalBewijs | null
  const prijs = page.prijs_in_cents ? (page.prijs_in_cents / 100).toFixed(0) : null

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-white border-b border-orange-100">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 text-slate-900">
            {page.hero_headline}
          </h1>
          {page.hero_subline && (
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">{page.hero_subline}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <ToolsCheckoutButton
              label={page.cta_tekst || 'Probeer gratis'}
              slug={slug}
              stripePriceId={page.stripe_price_id}
              prijs={prijs}
            />
            {prijs && (
              <span className="text-sm text-slate-500">€{prijs}/maand · Opzegbaar per maand</span>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      {features.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-xl border border-slate-100 hover:border-orange-200 transition">
                <span className="text-2xl flex-shrink-0">{f.icon}</span>
                <div>
                  <p className="font-bold text-slate-900 mb-1">{f.titel}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.tekst}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Voordelen */}
      {voordelen.length > 0 && (
        <section className="bg-orange-50 py-12">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Wat je krijgt</h2>
            <ul className="space-y-3">
              {voordelen.map((v, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700">
                  <span className="text-orange-500 font-bold mt-0.5">✓</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Social proof */}
      {sociaalBewijs && (
        <section className="max-w-3xl mx-auto px-6 py-14 text-center">
          <blockquote className="text-xl text-slate-700 italic leading-relaxed mb-4">
            &ldquo;{sociaalBewijs.citaat}&rdquo;
          </blockquote>
          <p className="font-semibold text-slate-900">{sociaalBewijs.naam}</p>
          <p className="text-sm text-slate-500">{sociaalBewijs.functie}</p>
        </section>
      )}

      {/* Prijs CTA */}
      {prijs && (
        <section className="bg-slate-900 text-white py-14">
          <div className="max-w-xl mx-auto px-6 text-center">
            <p className="text-4xl font-extrabold mb-1">€{prijs}<span className="text-lg font-normal text-slate-400">/maand</span></p>
            <p className="text-slate-400 mb-6">Opzegbaar per maand. Geen verborgen kosten.</p>
            <ToolsCheckoutButton
              label={page.cta_tekst || 'Start nu'}
              slug={slug}
              stripePriceId={page.stripe_price_id}
              prijs={prijs}
              dark
            />
          </div>
        </section>
      )}

      {/* FAQ */}
      {faq.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Veelgestelde vragen</h2>
          <div className="space-y-4">
            {faq.map((item, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-5">
                <p className="font-semibold text-slate-900 mb-2">{item.vraag}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{item.antwoord}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <a href="/" className="hover:text-orange-500 transition">VakwebTwente</a>
        {' · '}
        <a href="/privacy" className="hover:text-orange-500 transition">Privacy</a>
      </footer>
    </main>
  )
}
