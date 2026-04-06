'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md mx-auto text-center">
        <div className="text-7xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-4">Betaling gelukt!</h1>
        <p className="text-gray-600 text-lg mb-4">
          Claude AI schrijft nu jouw persoonlijke gids. Binnen 5 minuten ontvang je een e-mail met jouw gepersonaliseerde PDF.
        </p>
        <div className="bg-indigo-50 rounded-xl p-5 mb-8 text-left">
          <h3 className="font-bold text-indigo-800 mb-2">Wat gebeurt er nu?</h3>
          <ol className="text-sm text-indigo-700 space-y-1 list-decimal list-inside">
            <li>Claude analyseert jouw antwoorden</li>
            <li>Een volledig persoonlijk stappenplan wordt geschreven</li>
            <li>Je ontvangt de gids per e-mail (check ook spam)</li>
          </ol>
        </div>
        {orderId && (
          <p className="text-xs text-gray-400 mb-6">Ordernummer: {orderId}</p>
        )}
        <Link href="/" className="text-indigo-600 underline hover:text-indigo-800">
          Bekijk andere gidsen →
        </Link>
      </div>
    </main>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
