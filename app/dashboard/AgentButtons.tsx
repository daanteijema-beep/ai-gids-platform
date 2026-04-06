'use client'

import { useState } from 'react'

type AgentResult = {
  success?: boolean
  error?: string
  count?: number
  researchSummary?: string
  trendsFound?: number
  summary?: string
  pdfsAnalyzed?: number
  learningsAdded?: number
  followup?: { sent: number }
  crosssell?: { sent: number }
  [key: string]: unknown
}

type AgentStatus = 'idle' | 'loading' | 'done' | 'error'

type Agent = {
  key: string
  label: string
  description: string
  icon: string
  endpoint: string
}

const AGENTS: Agent[] = [
  {
    key: 'research',
    label: 'Research Agent',
    description: 'Zoekt via Google/Reddit nieuwe niche ideeën voor PDFs',
    icon: '🔬',
    endpoint: '/api/agents/research',
  },
  {
    key: 'trends',
    label: 'Social Trends Agent',
    description: 'Onderzoekt actuele trends op Instagram, LinkedIn & TikTok',
    icon: '📱',
    endpoint: '/api/agents/social-trends',
  },
  {
    key: 'orchestrator',
    label: 'Orchestrator',
    description: 'Analyseert alle sales & schrijft learnings voor andere agents',
    icon: '🧠',
    endpoint: '/api/agents/orchestrate',
  },
  {
    key: 'outreach',
    label: 'Outreach Agent',
    description: 'Stuurt follow-ups naar leads en cross-sells naar klanten',
    icon: '📧',
    endpoint: '/api/outreach',
  },
]

function resultSummary(key: string, result: AgentResult): string {
  if (result.error) return `Fout: ${result.error}`
  if (key === 'research') return `${result.count ?? 0} nieuwe ideeën aangemaakt${result.researchSummary ? ` — ${result.researchSummary}` : ''}`
  if (key === 'trends') return `${result.trendsFound ?? 0} trends gevonden — ${result.summary ?? ''}`
  if (key === 'orchestrator') return `${result.pdfsAnalyzed ?? 0} PDFs geanalyseerd, ${result.learningsAdded ?? 0} learnings opgeslagen`
  if (key === 'outreach') return `Follow-ups: ${result.followup?.sent ?? 0} · Cross-sells: ${result.crosssell?.sent ?? 0}`
  return 'Klaar'
}

export default function AgentButtons() {
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({})
  const [results, setResults] = useState<Record<string, AgentResult>>({})

  const run = async (agent: Agent) => {
    setStatuses(s => ({ ...s, [agent.key]: 'loading' }))
    setResults(r => ({ ...r, [agent.key]: {} }))

    try {
      const res = await fetch(agent.endpoint, { method: 'POST' })
      const data: AgentResult = await res.json()
      setResults(r => ({ ...r, [agent.key]: data }))
      setStatuses(s => ({ ...s, [agent.key]: data.error ? 'error' : 'done' }))
    } catch (err) {
      setResults(r => ({ ...r, [agent.key]: { error: String(err) } }))
      setStatuses(s => ({ ...s, [agent.key]: 'error' }))
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-8">
      {AGENTS.map(agent => {
        const status = statuses[agent.key] ?? 'idle'
        const result = results[agent.key]

        return (
          <div key={agent.key} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="font-bold text-base flex items-center gap-2">
                  <span>{agent.icon}</span> {agent.label}
                </h2>
                <p className="text-gray-500 text-sm mt-0.5">{agent.description}</p>
              </div>
              <button
                onClick={() => run(agent)}
                disabled={status === 'loading'}
                className="flex-shrink-0 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Bezig...' : 'Start →'}
              </button>
            </div>

            {status === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                <span className="animate-spin inline-block">⏳</span>
                <span>Agent is bezig — dit kan 30-60 seconden duren...</span>
              </div>
            )}

            {status === 'done' && result && (
              <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                ✓ {resultSummary(agent.key, result)}
              </div>
            )}

            {status === 'error' && result && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                ✗ {result.error}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
