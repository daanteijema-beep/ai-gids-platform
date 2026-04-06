"use client";

import { useState } from "react";
import Link from "next/link";

type Stap = 0 | 1 | 2 | 3 | 4;

const diensten = [
  "CV-ketel storing",
  "CV-ketel onderhoud",
  "Nieuwe CV-ketel plaatsen",
  "Vloerverwarming",
  "Warmtepomp",
  "Anders",
];

const urgentie = [
  { label: "Vandaag (spoed)", emoji: "🚨" },
  { label: "Binnen een week", emoji: "📅" },
  { label: "Ik wil een offerte", emoji: "📋" },
];

const woonplaatsen = [
  "Enschede", "Hengelo", "Almelo", "Borne", "Oldenzaal",
  "Haaksbergen", "Losser", "Tubbergen", "Rijssen", "Anders",
];

export default function AanvraagFlow() {
  const [stap, setStap] = useState<Stap>(0);
  const [dienst, setDienst] = useState("");
  const [hoeUrgent, setHoeUrgent] = useState("");
  const [naam, setNaam] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [plaats, setPlaats] = useState("");
  const [verzonden, setVerzonden] = useState(false);

  function verstuur() {
    // In productie: POST naar eigen API route / e-mail webhook
    setVerzonden(true);
    setStap(4);
  }

  if (stap === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500 text-sm mb-6">
          Klik hieronder om de aanvraagflow te starten — precies zoals een klant dat doet op jouw website.
        </p>
        <button
          onClick={() => setStap(1)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
        >
          Stuur een aanvraag →
        </button>
        <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
          WhatsApp sturen
        </div>
      </div>
    );
  }

  if (stap === 4 && verzonden) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Bedankt, {naam}!</h3>
        <p className="text-slate-600 mb-2">
          Installatiebedrijf De Boer neemt zo snel mogelijk contact met je op.
        </p>
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg px-4 py-2 inline-block mt-2">
          Verwachte reactietijd: <strong>binnen 2 uur op werkdagen</strong>
        </p>
        <div className="mt-8 border-t border-green-200 pt-6">
          <p className="text-sm text-slate-600 mb-3 font-medium">
            Dit is een demo van VakwebTwente. Wil jij zo&apos;n aanvraagmachine voor jouw bedrijf?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Ja, ik wil dit ook →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Progress bar */}
      <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              stap > n ? "bg-green-500 text-white" : stap === n ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-400"
            }`}>
              {stap > n ? "✓" : n}
            </div>
            {n < 3 && <div className={`h-px flex-1 ${stap > n ? "bg-green-300" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      <div className="p-6">
        {/* Stap 1 */}
        {stap === 1 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Stap 1 van 3</p>
            <h3 className="font-bold text-lg text-slate-900 mb-5">Wat is uw vraag?</h3>
            <div className="grid grid-cols-2 gap-2">
              {diensten.map((d) => (
                <button
                  key={d}
                  onClick={() => { setDienst(d); setStap(2); }}
                  className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    dienst === d
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-700"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stap 2 */}
        {stap === 2 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Stap 2 van 3</p>
            <h3 className="font-bold text-lg text-slate-900 mb-1">Hoe dringend is het?</h3>
            <p className="text-slate-500 text-sm mb-5">U vroeg over: <strong className="text-slate-700">{dienst}</strong></p>
            <div className="space-y-3">
              {urgentie.map((u) => (
                <button
                  key={u.label}
                  onClick={() => { setHoeUrgent(u.label); setStap(3); }}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border text-sm font-medium transition-colors ${
                    hoeUrgent === u.label
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-700"
                  }`}
                >
                  <span className="text-xl">{u.emoji}</span>
                  {u.label}
                </button>
              ))}
            </div>
            <button onClick={() => setStap(1)} className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline">
              ← Vorige stap
            </button>
          </div>
        )}

        {/* Stap 3 */}
        {stap === 3 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Stap 3 van 3</p>
            <h3 className="font-bold text-lg text-slate-900 mb-5">Uw contactgegevens</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Naam</label>
                <input
                  type="text"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="Jan Jansen"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefoonnummer</label>
                <input
                  type="tel"
                  value={telefoon}
                  onChange={(e) => setTelefoon(e.target.value)}
                  placeholder="06-12345678"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Woonplaats</label>
                <select
                  value={plaats}
                  onChange={(e) => setPlaats(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
                >
                  <option value="">Selecteer uw woonplaats</option>
                  {woonplaatsen.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={verstuur}
              disabled={!naam || !telefoon || !plaats}
              className="mt-6 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              Verstuur aanvraag →
            </button>
            <p className="mt-3 text-xs text-slate-400 text-center">
              Uw gegevens worden alleen gebruikt om contact met u op te nemen.
            </p>
            <button onClick={() => setStap(2)} className="mt-2 block mx-auto text-xs text-slate-400 hover:text-slate-600 underline">
              ← Vorige stap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
