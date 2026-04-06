'use client'

import { useState } from 'react'

type Props = {
  endpoint: string
  label: string
  successLabel?: string
}

export default function RunProtectedActionButton({ endpoint, label, successLabel = 'Klaar' }: Props) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle')

  async function runAction() {
    setLoading(true)
    setStatus('idle')

    try {
      const res = await fetch(endpoint, { method: 'POST' })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={() => void runAction()}
      disabled={loading}
      className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
    >
      {loading ? 'Bezig...' : status === 'done' ? successLabel : status === 'error' ? 'Opnieuw proberen' : label}
    </button>
  )
}
