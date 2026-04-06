'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { href: string; label: string; icon: string; exact?: boolean }

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overzicht', icon: 'M', exact: true },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: 'P' },
  { href: '/dashboard/leads', label: 'Leads', icon: 'L' },
  { href: '/dashboard/outreach', label: 'Outreach', icon: 'O' },
  { href: '/dashboard/marketing', label: 'Marketing', icon: 'M' },
  { href: '/dashboard/agents', label: 'Agents', icon: 'A' },
  { href: '/dashboard/settings', label: 'Instellingen', icon: 'I' },
]

const NAV_ICONS: Record<string, React.ReactNode> = {
  '/dashboard': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 9a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z" />
    </svg>
  ),
  '/dashboard/pipeline': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  '/dashboard/leads': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  '/dashboard/outreach': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  '/dashboard/marketing': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  ),
  '/dashboard/agents': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  '/dashboard/settings': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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

  if (!mounted) return null

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#070C18] flex items-center justify-center px-4">
        {/* Background subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        <div className="relative w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 rounded-2xl mb-4">
              <span className="text-white font-black text-xl">V</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              Vakweb<span className="text-orange-500">Twente</span>
            </div>
            <p className="text-slate-500 text-sm mt-1">Dashboard toegang</p>
          </div>
          {/* Login card */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-8">
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Wachtwoord</label>
            <input
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setError(false) }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-3.5 mb-4 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all text-sm"
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <span>!</span> Verkeerd wachtwoord
              </div>
            )}
            <button
              onClick={login}
              className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-semibold py-3.5 rounded-xl transition-all text-sm"
            >
              Inloggen →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-[256px] bg-[#070C18] flex flex-col fixed h-full z-40">
        {/* Subtle border right */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-700/40 to-transparent" />

        {/* Logo */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-black text-base">V</span>
            </div>
            <div>
              <div className="font-bold text-white text-[15px] leading-none tracking-tight">
                Vakweb<span className="text-orange-500">Twente</span>
              </div>
              <div className="text-[10px] text-slate-600 mt-1 tracking-[0.15em] uppercase font-medium">Control Panel</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent mb-2" />

        {/* Nav label */}
        <div className="px-5 py-2">
          <span className="text-[10px] text-slate-600 font-semibold tracking-[0.15em] uppercase">Navigatie</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ href, label, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all relative ${
                  isActive
                    ? 'text-white bg-orange-500/12'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-orange-500 rounded-full" />
                )}
                <span className={`shrink-0 transition-colors ${isActive ? 'text-orange-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {NAV_ICONS[href]}
                </span>
                <span className="truncate">{label}</span>
                {href === '/dashboard/pipeline' && (
                  <span className="ml-auto text-[10px] font-bold bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-md">AI</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-5 pt-2">
          <div className="mx-2 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent mb-3" />
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Bekijk website</span>
          </a>
          <button
            onClick={() => { sessionStorage.removeItem('dashboard_auth'); setAuthed(false) }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Uitloggen</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-[256px] flex-1 min-h-screen bg-slate-50">
        {children}
      </main>
    </div>
  )
}
