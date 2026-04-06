"use client";

import Link from "next/link";
import { useState } from "react";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-slate-900 tracking-tight">
          Vakweb<span className="text-orange-500">Twente</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="/#hoe-het-werkt" className="hover:text-slate-900 transition-colors">Hoe het werkt</Link>
          <Link href="/demo" className="hover:text-slate-900 transition-colors">Demo bekijken</Link>
          <Link href="/prijzen" className="hover:text-slate-900 transition-colors">Prijzen</Link>
        </nav>

        <Link
          href="/contact"
          className="hidden md:inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Afspraak maken →
        </Link>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Menu"
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 flex flex-col gap-4 text-sm font-medium text-slate-700">
          <Link href="/#hoe-het-werkt" onClick={() => setOpen(false)}>Hoe het werkt</Link>
          <Link href="/demo" onClick={() => setOpen(false)}>Demo bekijken</Link>
          <Link href="/prijzen" onClick={() => setOpen(false)}>Prijzen</Link>
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            Afspraak maken →
          </Link>
        </div>
      )}
    </header>
  );
}
