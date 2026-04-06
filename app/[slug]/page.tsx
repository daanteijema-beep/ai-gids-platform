'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

type FormField = {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea'
  placeholder?: string
  options?: string[]
  required: boolean
}

type Pdf = {
  id: string
  title: string
  subtitle: string
  description: string
  price: number
  slug: string
  form_fields: FormField[]
}

type LandingPage = {
  hero_headline: string
  hero_subtext: string
  pain_points: string[]
  benefits: string[]
  social_proof: string[]
  faq: { question: string; answer: string }[]
}

// Preview content — shown before payment
const PREVIEW_CONTENT = `## Wat je krijgt in jouw persoonlijke gids

### 1. Persoonlijke analyse van jouw situatie
We beginnen met een eerlijke analyse van waar jij nu staat. Geen standaard verhaal — alleen wat voor jóu relevant is.

### 2. Stap-voor-stap AI strategie (5-7 stappen)
Concrete stappen die je deze week kunt zetten. Geen technische kennis vereist.

### 3. Tools en prompts die direct werken
Copy-paste prompts die jij morgen kunt gebruiken in ChatGPT of Claude.

---
*De rest van de gids is persoonlijk en wordt gegenereerd op basis van jouw antwoorden...*`

export default function LandingPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  const [pdf, setPdf] = useState<Pdf | null>(null)
  const [landing, setLanding] = useState<LandingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'hero' | 'preview' | 'form' | 'paying'>('hero')
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const cancelled = searchParams.get('cancelled')

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

  const handleFormChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!pdf) return
    if (!email || !name) { setError('Vul je naam en email in'); return }

    const requiredFields = pdf.form_fields.filter(f => f.required)
    for (const field of requiredFields) {
      if (!formData[field.key]) { setError(`Vul "${field.label}" in`); return }
    }

    setSubmitting(true)
    setError('')

    try {
      // Save lead
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, pdfId: pdf.id, source: 'landing_page_form' }),
      })

      // Create checkout session
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfId: pdf.id,
          customerName: name,
          customerEmail: email,
          customerInputs: formData,
        }),
      })

      const data = await res.json()
      if (data.url) {
        setStep('paying')
        window.location.href = data.url
      } else {
        setError('Er ging iets mis. Probeer opnieuw.')
        setSubmitting(false)
      }
    } catch {
      setError('Er ging iets mis. Probeer opnieuw.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-lg">Laden...</div>
      </div>
    )
  }

  if (!pdf) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">404</p>
          <p className="text-gray-500">Deze gids bestaat niet.</p>
          <a href="/" className="text-indigo-600 underline mt-4 inline-block">Terug naar alle gidsen</a>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      {cancelled && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 text-center text-yellow-800 text-sm">
          Betaling geannuleerd — je kunt het opnieuw proberen.
        </div>
      )}

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            Persoonlijke AI-gids · €{pdf.price}
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            {landing?.hero_headline || pdf.title}
          </h1>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            {landing?.hero_subtext || pdf.subtitle}
          </p>
          {step === 'hero' && (
            <button
              onClick={() => setStep('preview')}
              className="bg-white text-indigo-700 font-bold px-8 py-4 rounded-full hover:bg-indigo-50 transition text-lg"
            >
              Bekijk een preview →
            </button>
          )}
        </div>
      </section>

      {/* Pain points */}
      {landing?.pain_points && landing.pain_points.length > 0 && (
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Herken jij dit?</h2>
            <ul className="space-y-3">
              {landing.pain_points.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-red-400 mt-1 flex-shrink-0">✗</span>
                  <span className="text-gray-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Preview PDF */}
      {(step === 'preview' || step === 'form' || step === 'paying') && (
        <section className="py-16 px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Preview van jouw gids</h2>
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              {/* PDF header */}
              <div className="bg-indigo-600 text-white p-6">
                <p className="text-indigo-200 text-xs mb-1 uppercase tracking-widest">Persoonlijke AI Gids</p>
                <h3 className="text-xl font-bold">{pdf.title}</h3>
                <p className="text-indigo-200 text-sm mt-1">Persoonlijk voor [Jouw naam]</p>
              </div>
              {/* Preview content */}
              <div className="p-6 bg-white">
                <div className="prose prose-sm max-w-none text-gray-700">
                  {PREVIEW_CONTENT.split('\n').map((line, i) => {
                    if (line.startsWith('### ')) return <h3 key={i} className="font-bold text-gray-800 mt-4 mb-1">{line.slice(4)}</h3>
                    if (line.startsWith('## ')) return <h2 key={i} className="font-bold text-lg text-gray-900 mb-3">{line.slice(3)}</h2>
                    if (line.startsWith('---')) return <hr key={i} className="my-4 border-dashed" />
                    if (line.startsWith('*') && line.endsWith('*')) return <p key={i} className="text-gray-400 italic text-sm">{line.slice(1, -1)}</p>
                    if (line === '') return <br key={i} />
                    return <p key={i} className="mb-1">{line}</p>
                  })}
                </div>
                {/* Blur overlay */}
                <div className="relative -mx-6 -mb-6 mt-4">
                  <div className="h-24 bg-gradient-to-b from-transparent to-white" />
                  <div className="bg-white px-6 pb-6 text-center">
                    <p className="text-gray-500 text-sm mb-3">De volledige gids wordt persoonlijk voor jou geschreven op basis van jouw situatie.</p>
                    <button
                      onClick={() => setStep('form')}
                      className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-full hover:bg-indigo-700 transition"
                    >
                      Ontvang mijn persoonlijke gids voor €{pdf.price} →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      {landing?.benefits && landing.benefits.length > 0 && (
        <section className="py-16 px-6 bg-indigo-50">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Wat je leert</h2>
            <ul className="space-y-3">
              {landing.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-indigo-500 mt-1 flex-shrink-0">✓</span>
                  <span className="text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Form + Checkout */}
      {step === 'form' && (
        <section className="py-16 px-6" id="bestel">
          <div className="max-w-lg mx-auto">
            <div className="bg-white border-2 border-indigo-200 rounded-2xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-2 text-center">Jouw persoonlijke gids</h2>
              <p className="text-gray-500 text-sm text-center mb-6">Beantwoord de vragen — wij schrijven een gids speciaal voor jou</p>

              {/* Contact info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jouw naam *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="bijv. Jan de Vries"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres (voor bezorging) *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jouw@email.nl"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Dynamic form fields */}
              <div className="space-y-4 mb-6 border-t border-gray-100 pt-6">
                <p className="text-sm font-medium text-gray-600 mb-2">Jouw situatie (voor personalisatie):</p>
                {pdf.form_fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label} {field.required && '*'}
                    </label>
                    {field.type === 'select' && field.options ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={e => handleFormChange(field.key, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-indigo-400 bg-white"
                      >
                        <option value="">Kies een optie...</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.key] || ''}
                        onChange={e => handleFormChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-indigo-400 resize-none"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.key] || ''}
                        onChange={e => handleFormChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-indigo-400"
                      />
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {submitting ? 'Doorsturen naar betaling...' : `Betaal €${pdf.price} en ontvang jouw gids`}
              </button>

              <p className="text-center text-gray-400 text-xs mt-3">
                Veilig betalen via Stripe · Direct in je inbox · Geld-terug garantie
              </p>
            </div>
          </div>
        </section>
      )}

      {step === 'paying' && (
        <section className="py-24 px-6 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold mb-2">Doorsturen naar betaling...</h2>
            <p className="text-gray-500">Je wordt zo doorgestuurd naar Stripe.</p>
          </div>
        </section>
      )}

      {/* FAQ */}
      {landing?.faq && landing.faq.length > 0 && (
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">Veelgestelde vragen</h2>
            <div className="space-y-4">
              {landing.faq.map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-2">{item.question}</h3>
                  <p className="text-gray-600 text-sm">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      {step === 'hero' && (
        <section className="py-16 px-6 bg-indigo-600 text-white text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-3">Klaar om AI te laten werken voor jou?</h2>
            <p className="text-indigo-100 mb-6">Voor slechts €{pdf.price} ontvang je een volledig persoonlijk stappenplan.</p>
            <button
              onClick={() => setStep('preview')}
              className="bg-white text-indigo-700 font-bold px-8 py-4 rounded-full hover:bg-indigo-50 transition"
            >
              Ja, ik wil mijn persoonlijke gids →
            </button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-100 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} AI Gids voor Ondernemers · <a href="/" className="hover:text-gray-600">Alle gidsen</a> · <a href="/privacy" className="hover:text-gray-600">Privacy</a></p>
      </footer>
    </main>
  )
}
