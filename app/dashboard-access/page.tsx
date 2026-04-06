'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function DashboardAccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const nextPath = useMemo(() => {
    const next = searchParams.get('next')
    return next && next.startsWith('/dashboard') ? next : '/dashboard'
  }, [searchParams])

  async function login() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/dashboard/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, next: nextPath }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Inloggen mislukt.')
        return
      }

      router.replace(data.next || nextPath)
      router.refresh()
    } catch {
      setError('Netwerkfout tijdens inloggen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#070C18] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 rounded-2xl mb-4">
            <span className="text-white font-black text-xl">V</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Vakweb<span className="text-orange-500">Twente</span>
          </div>
          <p className="text-slate-500 text-sm mt-1">Dashboard toegang</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-8">
          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Wachtwoord</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                void login()
              }
            }}
            placeholder="Voer je dashboard wachtwoord in"
            className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-3.5 mb-4 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all text-sm"
            autoFocus
          />
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <span>!</span>
              <span>{error}</span>
            </div>
          )}
          <button
            onClick={() => void login()}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3.5 rounded-xl transition-all text-sm"
          >
            {loading ? 'Bezig...' : 'Inloggen'}
          </button>
        </div>
      </div>
    </div>
  )
}
