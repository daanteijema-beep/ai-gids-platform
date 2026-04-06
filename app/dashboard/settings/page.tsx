'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SettingsContent() {
  const params = useSearchParams()
  const metaConnected = params.get('meta_connected')
  const igFound = params.get('ig')
  const error = params.get('error')

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
        <p className="text-gray-500 mt-1">Koppel social media accounts voor automatisch posten</p>
      </div>

      {metaConnected && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-700 font-medium">
            Meta gekoppeld! {igFound === '1' ? '✓ Instagram Business account gevonden.' : '⚠ Geen Instagram Business account — zorg dat je IG account gekoppeld is aan een Facebook Page.'}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700">{error === 'meta_denied' ? 'Toegang geweigerd bij Meta.' : 'Er ging iets mis. Probeer opnieuw.'}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Meta / Instagram */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span>📸</span> Meta (Instagram + Facebook)
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Verbind je Instagram Business account voor automatisch posten
              </p>
            </div>
            <a
              href="/api/meta/connect"
              className="bg-blue-600 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm"
            >
              Koppel Meta account →
            </a>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Vereisten:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Een Facebook Page (zakelijk)</li>
              <li>Een Instagram Business of Creator account</li>
              <li>Het Instagram account gekoppeld aan de Facebook Page</li>
            </ul>
          </div>
        </div>

        {/* LinkedIn */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span>💼</span> LinkedIn
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Automatisch posten op je LinkedIn profiel of bedrijfspagina
              </p>
            </div>
            <div className="text-sm text-gray-400 bg-gray-50 px-4 py-2.5 rounded-lg border">
              Handmatig instellen
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Hoe:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Ga naar <a href="https://linkedin.com/developers" target="_blank" className="text-indigo-600 underline">linkedin.com/developers</a></li>
              <li>Maak een app aan → OAuth 2.0 → genereer token met <code>w_member_social</code></li>
              <li>Voeg toe aan Vercel: <code>LINKEDIN_ACCESS_TOKEN</code> en <code>LINKEDIN_AUTHOR_ID</code></li>
            </ol>
          </div>
        </div>

        {/* TikTok */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 opacity-60">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span>🎵</span> TikTok
            </h2>
            <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">Geen publieke API</span>
          </div>
          <p className="text-gray-500 text-sm">
            TikTok heeft geen publieke auto-post API. Posts worden gegenereerd en staan klaar in de Social kalender — je plaatst ze handmatig.
          </p>
        </div>

        {/* Cron schedule */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-bold text-lg mb-4">Agent Schedule</h2>
          <div className="space-y-2 text-sm">
            {[
              { agent: 'Research Agent', schedule: 'Dagelijks 08:00', desc: 'Zoekt nieuwe niche ideeën via web research' },
              { agent: 'Social Trends Agent', schedule: 'Woensdag 07:00', desc: 'Onderzoekt actuele social media trends' },
              { agent: 'Orchestrator Agent', schedule: 'Maandag 09:00', desc: 'Analyseert sales, schrijft learnings' },
              { agent: 'Outreach Agent', schedule: 'Dinsdag 10:00', desc: 'Follow-ups + cross-sells' },
            ].map(({ agent, schedule, desc }) => (
              <div key={agent} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="font-medium text-gray-800">{agent}</span>
                  <p className="text-gray-400 text-xs">{desc}</p>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">{schedule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
