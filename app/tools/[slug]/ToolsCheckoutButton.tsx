'use client'

import { useState } from 'react'

type Props = {
  label: string
  slug: string
  stripePriceId: string | null
  prijs: string | null
  dark?: boolean
}

export default function ToolsCheckoutButton({ label, slug, stripePriceId, dark }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!stripePriceId) return
    setLoading(true)
    const res = await fetch('/api/tools/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripePriceId, slug }),
    })
    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    } else {
      setLoading(false)
    }
  }

  if (!stripePriceId) return null

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-8 py-3.5 rounded-xl font-bold text-base transition disabled:opacity-60 ${
        dark
          ? 'bg-orange-500 hover:bg-orange-400 text-white'
          : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200'
      }`}
    >
      {loading ? 'Laden...' : label}
    </button>
  )
}
