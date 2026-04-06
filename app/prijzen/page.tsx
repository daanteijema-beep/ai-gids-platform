import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Prijzen – VakwebTwente",
  description: "Eerlijke prijzen voor aanvraagmachines voor Twentse vakbedrijven. Basis €79/maand of Pro €149/maand.",
};

const basisFeatures = [
  "Professionele website (5–7 pagina's)",
  "Mobiel-vriendelijk en snel",
  "Aanvraagformulier",
  "WhatsApp-knop",
  "Google Business Profile basisinrichting",
  "Hosting + SSL inbegrepen",
  "1× aanpassing per maand",
  "E-mail support",
];

const proFeatures = [
  "Alles van Basis",
  "Slimme aanvraagflow (AI-gestuurd, stap-voor-stap)",
  "24/7 actief — ook buiten kantooruren",
  "Directe melding via e-mail en WhatsApp",
  "WhatsApp Business integratie",
  "Maandelijks aanvragenrapport",
  "Google Business Profile optimalisatie",
  "Reviews strategie",
  "3× aanpassingen per maand",
  "Telefonische support",
];

const faq = [
  {
    v: "Zit ik eraan vast?",
    a: "Bij maandabonnement kun je elk moment opzeggen. Bij jaarcontract loop je uiteraard de jaarperiode vol, maar je profiteert dan wel van gratis setup (€299–€399 voordeel).",
  },
  {
    v: "Hoe snel staat mijn website live?",
    a: "Binnen 5 werkdagen na de kennismaking. We werken met bewezen templates die we aanpassen op jouw bedrijf.",
  },
  {
    v: "Wat als ik al een website heb?",
    a: "Dan bekijken we samen of we die kunnen verbeteren, of we bouwen een nieuwe op. In veel gevallen is een nieuwe site sneller en goedkoper dan een bestaande site repareren.",
  },
  {
    v: "Moet ik zelf content aanleveren?",
    a: "We hebben een korte intake van 20 minuten nodig. De rest schrijven wij — teksten, structuur en inrichting. Foto's help je ons mee te sturen, maar ook dat is optioneel.",
  },
  {
    v: "Hoe werkt de aanvraagflow precies?",
    a: "Bezoekers doorlopen een paar eenvoudige stappen (wat is uw vraag? hoe dringend? contactgegevens). Na invullen krijg jij direct een e-mail en/of WhatsApp-bericht met alle gegevens. Geen ingewikkelde software nodig.",
  },
  {
    v: "Kan ik upgraden van Basis naar Pro?",
    a: "Ja, altijd. Je betaalt dan het verschil voor de resterende maanden of je stapt over bij verlenging.",
  },
];

export default function PrijzenPage() {
  return (
    <>
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-4">Eerlijke prijzen. Geen verrassingen.</h1>
          <p className="text-slate-400 text-lg">
            Setup eenmalig €299–€399 — of <strong className="text-white">gratis</strong> bij jaarcontract.
          </p>
        </div>
      </section>

      {/* PAKKETTEN */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">

            {/* BASIS */}
            <div className="border border-slate-200 rounded-2xl p-8">
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Basis</div>
              <div className="text-5xl font-extrabold text-slate-900 mb-1">
                €79<span className="text-xl font-normal text-slate-500">/maand</span>
              </div>
              <div className="text-slate-500 text-sm mb-1">of €799/jaar (2 maanden gratis)</div>
              <div className="text-slate-600 text-sm mb-6 pb-6 border-b border-slate-100">
                Setup: <strong>€299 eenmalig</strong> — of gratis bij jaarcontract
              </div>
              <ul className="space-y-3 mb-8">
                {basisFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="block text-center border-2 border-orange-500 text-orange-600 font-bold py-3 rounded-xl hover:bg-orange-50 transition-colors"
              >
                Start met Basis
              </Link>
            </div>

            {/* PRO */}
            <div className="border-2 border-orange-500 rounded-2xl p-8 relative bg-orange-50/30">
              <div className="absolute -top-4 right-5 bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                Meest gekozen
              </div>
              <div className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-2">Pro</div>
              <div className="text-5xl font-extrabold text-slate-900 mb-1">
                €149<span className="text-xl font-normal text-slate-500">/maand</span>
              </div>
              <div className="text-slate-500 text-sm mb-1">of €1.499/jaar (2 maanden gratis)</div>
              <div className="text-slate-600 text-sm mb-6 pb-6 border-b border-orange-100">
                Setup: <strong>€399 eenmalig</strong> — of gratis bij jaarcontract
              </div>
              <ul className="space-y-3 mb-8">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <svg className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="block text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Start met Pro →
              </Link>
            </div>
          </div>

          {/* ROI KADER */}
          <div className="mt-12 bg-slate-900 text-white rounded-2xl p-8">
            <h3 className="font-bold text-xl mb-4 text-center">Reken het zelf even uit</h3>
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-extrabold text-orange-400 mb-1">€30–€80</div>
                <div className="text-slate-400 text-sm">kosten per lead via Werkspot</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-orange-400 mb-1">×10</div>
                <div className="text-slate-400 text-sm">gemiddelde leads per maand</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-orange-400 mb-1">€300–€800</div>
                <div className="text-slate-400 text-sm">wat je nu betaalt — of €149 via ons</div>
              </div>
            </div>
            <p className="text-slate-400 text-sm text-center mt-6">
              Je eigen aanvraagmachine verdient zichzelf terug bij de eerste 2 extra aanvragen per maand.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">Veelgestelde vragen</h2>
          <div className="space-y-5">
            {faq.map((item) => (
              <div key={item.v} className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">{item.v}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-orange-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Klaar om te starten?</h2>
          <p className="text-slate-600 mb-8">
            Plan een gratis gesprek van 20 minuten. Geen verplichtingen, geen verkoopverhaal.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Plan een gratis gesprek →
            </Link>
            <Link
              href="/demo"
              className="border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold px-8 py-4 rounded-xl text-lg bg-white transition-colors"
            >
              Bekijk de demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
