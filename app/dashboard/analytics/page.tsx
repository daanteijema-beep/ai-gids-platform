'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Funnel = {
  runs: number; running: number; completed: number
  ideas: number; selectedIdeas: number
  leads: number; emailsKlaar: number; emailsVerstuurd: number
}

type Run = {
  id: string; status: string; huidige_stap: number; created_at: string
  product_ideas?: { naam: string }
}

type Learning = {
  doelgroep: string; beste_kanaal: string; totaal_leads: number; totaal_reacties: number; wat_werkte: string
}

type SectorStat = { sector: string; count: number }

type PdfStat = {
  id: string; title: string; price: number; active: boolean
  sold: number; revenue: number; leads: number; conversion: string; daysLive: number
}

const STAP_LABELS: Record<number, string> = {
  1: 'Research', 2: 'Marketing plan', 3: 'Landingspagina',
  4: 'Content', 5: 'Leads', 6: 'Outreach',
}

const STATUS_STYLE: Record<string, string> = {
  running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  wacht_op_goedkeuring: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  voltooid: 'bg-green-500/10 text-green-400 border-green-500/20',
  afgewezen: 'bg-red-500/10 text-red-400 border-red-500/20',
}

function FunnelBar({ value, max, label, sublabel, color }: { value: number; max: number; label: string; sublabel: string; color: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4
  return (
    <div className="flex items-center gap-4">
      <div className="w-28 text-right shrink-0">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-xs text-slate-400">{sublabel}</div>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-12 text-right">
        <span className="text-lg font-bold text-slate-900">{value}</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [recentRuns, setRecentRuns] = useState<Run[]>([])
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [topSectors, setTopSectors] = useState<SectorStat[]>([])
  const [pdfStats, setPdfStats] = useState<PdfStat[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [pipelineRes, pdfRes] = await Promise.all([
        fetch('/api/analytics/pipeline'),
        fetch('/api/analytics/pdf').catch(() => null),
      ])
      if (pipelineRes.ok) {
        const d = await pipelineRes.json()
        setFunnel(d.funnel)
        setRecentRuns(d.recentRuns || [])
        setLearnings(d.learnings || [])
        setTopSectors(d.topSectors || [])
      }
      if (pdfRes?.ok) {
        const d = await pdfRes.json()
        setPdfStats(d.pdfStats || [])
        setTotalRevenue(d.totalRevenue || 0)
      }
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-64">
      <div className="text-slate-400">Analytics laden...</div>
    </div>
  )

  const maxFunnel = funnel?.runs || 1

  return (
    <div className="p-8 max-w-[1200px]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
        <p className="text-slate-500 mt-1 text-sm">Pipeline prestaties, outreach, leads en omzet</p>
      </div>

      {/* KPI rij */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pipeline runs', value: funnel?.runs || 0, icon: '⚡', color: 'bg-orange-500', sub: `${funnel?.completed || 0} voltooid` },
          { label: 'Leads gevonden', value: funnel?.leads || 0, icon: '🎯', color: 'bg-blue-500', sub: 'via Google Places' },
          { label: 'Emails klaar', value: funnel?.emailsKlaar || 0, icon: '📬', color: 'bg-purple-500', sub: `${funnel?.emailsVerstuurd || 0} verstuurd` },
          { label: 'Omzet', value: `€${totalRevenue.toFixed(0)}`, icon: '💰', color: 'bg-green-500', sub: 'PDF platform' },
        ].map(({ label, value, icon, color, sub }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${color}`} />
            <div className="text-2xl mb-3">{icon}</div>
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{value}</div>
            <div className="text-sm font-medium text-slate-600 mt-0.5">{label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Pipeline funnel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-bold text-slate-900 mb-5 text-[15px]">Pipeline funnel</h2>
          <div className="space-y-4">
            <FunnelBar value={funnel?.runs || 0} max={maxFunnel} label="Runs" sublabel="gestart" color="bg-orange-400" />
            <FunnelBar value={funnel?.ideas || 0} max={maxFunnel} label="Ideeën" sublabel="gegenereerd" color="bg-orange-300" />
            <FunnelBar value={funnel?.selectedIdeas || 0} max={maxFunnel} label="Goedgekeurd" sublabel="doorgestuurd" color="bg-blue-400" />
            <FunnelBar value={funnel?.leads || 0} max={maxFunnel} label="Leads" sublabel="gevonden" color="bg-blue-300" />
            <FunnelBar value={funnel?.emailsKlaar || 0} max={maxFunnel} label="Emails" sublabel="gegenereerd" color="bg-purple-400" />
            <FunnelBar value={funnel?.emailsVerstuurd || 0} max={maxFunnel} label="Verstuurd" sublabel="daadwerkelijk" color="bg-green-400" />
          </div>
        </div>

        {/* Top sectoren */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-bold text-slate-900 mb-5 text-[15px]">Beste sectoren voor leads</h2>
          {topSectors.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Nog geen sector data — start de pipeline.</div>
          ) : (
            <div className="space-y-3">
              {topSectors.map(({ sector, count }, i) => (
                <div key={sector} className="flex items-center gap-3">
                  <div className="w-5 text-xs text-slate-400 font-mono text-right shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 truncate">{sector}</span>
                      <span className="text-sm font-bold text-slate-900 ml-2 shrink-0">{count}</span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full"
                        style={{ width: `${(count / (topSectors[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Recente runs */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-[15px]">Recente pipeline runs</h2>
            <Link href="/dashboard/pipeline" className="text-xs text-orange-500 font-medium hover:text-orange-600">Alles →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentRuns.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-400 text-sm">Nog geen runs.</div>
            ) : recentRuns.map((run) => (
              <div key={run.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                  {run.huidige_stap || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">
                    {run.product_ideas?.naam || 'Geen idee geselecteerd'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Stap {run.huidige_stap}: {STAP_LABELS[run.huidige_stap] || '—'} · {new Date(run.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${STATUS_STYLE[run.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {run.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign learnings */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-[15px]">Wat de agents leerden</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {learnings.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-400 text-sm">Nog geen learnings — voltooi een pipeline run.</div>
            ) : learnings.slice(0, 6).map((l, i) => (
              <div key={i} className="px-6 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-500">{l.doelgroep}</span>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-blue-500">{l.beste_kanaal}</span>
                  {l.totaal_leads > 0 && <span className="text-xs text-slate-400 ml-auto">{l.totaal_leads} leads</span>}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{l.wat_werkte}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PDF stats */}
      {pdfStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-[15px]">PDF Platform prestaties</h2>
            <span className="text-sm font-bold text-green-600">€{totalRevenue.toFixed(2)} totaal</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">PDF</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Prijs</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Verkopen</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Conversie</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pdfStats.map((pdf) => (
                  <tr key={pdf.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${pdf.active ? 'bg-green-400' : 'bg-slate-300'}`} />
                        <span className="font-medium text-slate-800">{pdf.title}</span>
                        <span className="text-xs text-slate-400">{pdf.daysLive}d live</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">€{pdf.price}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{pdf.sold}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${Number(pdf.conversion) >= 10 ? 'bg-green-100 text-green-700' : Number(pdf.conversion) >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                        {pdf.conversion}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-green-600">€{pdf.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
