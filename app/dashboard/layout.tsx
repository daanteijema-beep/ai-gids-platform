'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Overzicht', icon: '📊' },
  { href: '/dashboard/ideas', label: 'Ideeën', icon: '💡' },
  { href: '/dashboard/pdfs', label: "PDF's", icon: '📄' },
  { href: '/dashboard/orders', label: 'Bestellingen', icon: '🛒' },
  { href: '/dashboard/social', label: 'Social Media', icon: '📱' },
  { href: '/dashboard/leads', label: 'Leads', icon: '👥' },
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

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <h1 className="text-2xl font-bold mb-6 text-center">Dashboard</h1>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (pw === process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD || pw === 'admin123') {
                  sessionStorage.setItem('dashboard_auth', 'ok')
                  setAuthed(true)
                } else setError(true)
              }
            }}
            placeholder="Wachtwoord"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-indigo-400"
          />
          {error && <p className="text-red-500 text-sm mb-3">Verkeerd wachtwoord</p>}
          <button
            onClick={() => {
              if (pw === 'admin123') {
                sessionStorage.setItem('dashboard_auth', 'ok')
                setAuthed(true)
              } else setError(true)
            }}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            Inloggen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col py-6 px-4 fixed h-full">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-white">AI Gids</h1>
          <p className="text-gray-400 text-xs">Dashboard</p>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                pathname === href
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-gray-800 pt-4">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <span>🌐</span>
            <span>Bekijk website</span>
          </a>
        </div>
      </aside>

      {/* Content */}
      <main className="ml-56 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
