'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GenerateIdeasButton({ secret }: { secret: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const generate = async () => {
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch(`/api/agents/research?secret=${secret}`, {
        method: 'GET',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('done')
        setMessage(`✓ ${data.count} nieuwe ideeën gegenereerd!`)
        router.refresh()
        setTimeout(() => setStatus('idle'), 4000)
      } else {
        setStatus('error')
        setMessage(data.error || `HTTP ${res.status}: er ging iets mis.`)
      }
    } catch (err) {
      setStatus('error')
      setMessage(`Netwerkfout: ${err}`)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={generate}
        disabled={status === 'loading'}
        className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition ${
          status === 'loading'
            ? 'bg-indigo-400 text-white cursor-not-allowed'
            : status === 'done'
            ? 'bg-green-600 text-white'
            : status === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {status === 'loading' && (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        )}
        {status === 'idle' && '+ Nieuwe ideeën genereren'}
        {status === 'loading' && 'Bezig met research… (2-4 min)'}
        {status === 'done' && '✓ Klaar!'}
        {status === 'error' && '✗ Probeer opnieuw'}
      </button>
      {message && (
        <p className={`text-xs ${status === 'error' ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
