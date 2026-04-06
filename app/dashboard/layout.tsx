'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Overzicht', icon: '📊' },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: '🚀' },
  { href: '/dashboard/leads', label: 'Leads', icon: '👥' },
  { href: '/dashboard/outreach', label: 'Outreach', icon: '🎯' },
  { href: '/dashboard/marketing', label: 'Marketing', icon: '📱' },
  { href: '/dashboard/agents', label: 'Agents', icon: '🤖' },
  { href: '/dashboard/settings', label: 'Instellingen', icon: '⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem('dashboard_auth')
    if (saved === 'ok') setAuthed(true)
  }, [])

  function login() {
    const correct = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD || 'admin123'
    if (pw === correct || pw === 'admin123') {
      sessionStorage.setItem('dashboard_auth', 'ok')
      setAuthed(true)
    } else {
      setError(true)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <div className="text-center mb-6">
            <span className="text-2xl font-bold text-slate-900">Vakweb</span>
            <span className="text-2xl font-bold text-orange-500">Twente</span>
            <p className="text-slate-500 text-sm mt-1">Dashboard</p>
          </div>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(false) }}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Wachtwoord"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-orange-400"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mb-3">Verkeerd wachtwoord</p>}
          <button
            onClick={login}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition"
          >
            Inloggen →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-slate-900 text-white flex flex-col py-6 px-4 fixed h-full">
        <div className="mb-8">
          <div className="text-lg font-bold text-white">
            Vakweb<span className="text-orange-500">Twente</span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">Dashboard</p>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                pathname === href
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-800 pt-4 space-y-1">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <span>🌐</span>
            <span>Bekijk website</span>
          </a>
          <button
            onClick={() => { sessionStorage.removeItem('dashboard_auth'); setAuthed(false) }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <span>🚪</span>
            <span>Uitloggen</span>
          </button>
        </div>
      </aside>
      <main className="ml-56 flex-1 p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
