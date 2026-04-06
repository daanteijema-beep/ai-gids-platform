'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

type Pdf = {
  id: string
  title: string
  subtitle: string
  description: string
  price: number
  slug: string
  images?: {
    hero_banner?: string
    instagram?: string[]
    pdf_cover?: string
  }
}

type LandingPage = {
  hero_headline: string
  hero_subtext: string
  pain_points: string[]
  benefits: string[]
  social_proof: string[]
  faq: { question: string; answer: string }[]
}

export default function LandingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const cancelled = searchParams.get('cancelled')

  const [pdf, setPdf] = useState<Pdf | null>(null)
  const [landing, setLanding] = useState<LandingPage | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/pdf/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.pdf) setPdf(data.pdf)
        if (data.landing) setLanding(data.landing)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [slug])

  const handleSubmit = async () => {
    if (!pdf) return
    if (!email.trim() || !name.trim()) { setError('Vul je naam en e-mailadres in'); return }

    setSubmitting(true)
    setError('')

    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, pdfId: pdf.id, source: 'landing_page' }),
      })

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId: pdf.id, customerName: name, customerEmail: email, customerInputs: {} }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Er ging iets mis. Probeer opnieuw.')
        setSubmitting(false)
      }
    } catch {
      setError('Er ging iets mis. Probeer opnieuw.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!pdf) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-gray-700 font-medium">Deze gids bestaat niet meer.</p>
          <a href="/" className="text-indigo-600 underline mt-3 inline-block text-sm">← Bekijk andere gidsen</a>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      {cancelled && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-amber-800 text-sm">
          Betaling geannuleerd — je kunt het hieronder opnieuw proberen.
        </div>
      )}

      {/* Hero */}
      <section
        className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white"
        style={pdf.images?.hero_banner ? {
          backgroundImage: `linear-gradient(to bottom right, rgba(79,70,229,0.88), rgba(109,40,217,0.92)), url(${pdf.images.hero_banner})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              Direct beschikbaar · €{pdf.price}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
              {landing?.hero_headline || pdf.title}
            </h1>
            <p className="text-lg text-indigo-100 mb-6 leading-relaxed">
              {landing?.hero_subtext || pdf.subtitle || pdf.description}
            </p>
            {landing?.social_proof && landing.social_proof.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {landing.social_proof.map((proof, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm text-indigo-100">
                    <span className="text-green-400">✓</span> {proof}
                  </div>
                ))}
              </div>
            )}
            {/* PDF cover preview if available */}
            {pdf.images?.pdf_cover && (
              <div className="mt-8 hidden lg:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pdf.images.pdf_cover}
                  alt={`${pdf.title} preview`}
                  className="w-36 rounded-xl shadow-2xl border-2 border-white/20 rotate-2"
                  loading="lazy"
                />
              </div>
            )}
          </div>

          {/* Right: order form */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-8 text-gray-800">
            <h2 className="text-xl font-bold mb-1">Ontvang jouw gids direct</h2>
            <p className="text-sm text-gray-500 mb-5">Na betaling ontvang je de gids binnen 5 minuten in je inbox</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jouw naam *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  placeholder="bijv. Lisa de Vries"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="jouw@email.nl"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed text-base"
              >
                {submitting ? 'Doorsturen naar betaling...' : `Betaal €${pdf.price} — ontvang direct`}
              </button>

              <div className="flex items-center justify-center gap-4 text-xs text-gray-400 pt-1">
                <span>🔒 Veilig via Stripe</span>
                <span>📧 Direct in inbox</span>
                <span>↩️ Geld-terug garantie</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain points */}
      {landing?.pain_points && landing.pain_points.length > 0 && (
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-2">Herken jij dit?</h2>
            <p className="text-gray-500 text-center text-sm mb-8">De meest gehoorde frustraties van ondernemers zoals jij</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {landing.pain_points.map((point, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-red-100">
                  <span className="text-red-400 text-lg flex-shrink-0">✗</span>
                  <span className="text-gray-700 text-sm">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      {landing?.benefits && landing.benefits.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-2">Wat jij leert</h2>
            <p className="text-gray-500 text-center text-sm mb-8">Concrete kennis en stappen uit jouw gids</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {landing.benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-3 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <span className="text-indigo-500 text-lg flex-shrink-0">✓</span>
                  <span className="text-gray-700 text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Second CTA */}
      <section className="py-12 px-6 bg-indigo-600 text-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Klaar om te starten?</h2>
          <p className="text-indigo-100 text-sm mb-6">Vul je gegevens in bovenaan — je ontvangt je gids binnen minuten.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-white text-indigo-700 font-bold px-8 py-3.5 rounded-full hover:bg-indigo-50 transition"
          >
            Bestel nu voor €{pdf.price} →
          </button>
        </div>
      </section>

      {/* FAQ */}
      {landing?.faq && landing.faq.length > 0 && (
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Veelgestelde vragen</h2>
            <div className="space-y-3">
              {landing.faq.map((item, i) => (
                <details key={i} className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer">
                  <summary className="font-semibold text-gray-900 list-none flex justify-between items-center">
                    {item.question}
                    <span className="text-gray-400 ml-4 flex-shrink-0">+</span>
                  </summary>
                  <p className="text-gray-600 text-sm mt-3 leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="py-8 px-6 border-t border-gray-100 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} AI Gids voor Ondernemers &nbsp;·&nbsp;
          <a href="/" className="hover:text-gray-600">Alle gidsen</a> &nbsp;·&nbsp;
          <a href="/privacy" className="hover:text-gray-600">Privacy</a>
        </p>
      </footer>
    </main>
  )
}
