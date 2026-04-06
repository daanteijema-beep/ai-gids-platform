import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact – VakwebTwente",
  description:
    "Plan een gratis gesprek van 20 minuten. Wij bouwen jouw aanvraagmachine binnen 5 werkdagen. Geen verplichtingen.",
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-4">Plan een gratis gesprek</h1>
          <p className="text-slate-400 text-lg">
            20 minuten. Geen verkoopverhaal. Gewoon kijken wat we voor jou kunnen doen.
          </p>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">

          {/* CONTACTFORMULIER */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Stuur ons een bericht</h2>
            <p className="text-slate-500 text-sm mb-8">
              We reageren binnen 1 werkdag — meestal dezelfde dag nog.
            </p>
            <form
              action="https://formspree.io/f/placeholder"
              method="POST"
              className="space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Naam *</label>
                  <input
                    type="text"
                    name="naam"
                    required
                    placeholder="Jan Jansen"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bedrijfsnaam</label>
                  <input
                    type="text"
                    name="bedrijf"
                    placeholder="Jansen Installaties"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefoonnummer *</label>
                <input
                  type="tel"
                  name="telefoon"
                  required
                  placeholder="06-12345678"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mailadres *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="jan@janseninstallaties.nl"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Wat doe jij?</label>
                <select
                  name="sector"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
                >
                  <option value="">Selecteer jouw sector</option>
                  <option>Installatiebedrijf</option>
                  <option>Loodgieter</option>
                  <option>Elektricien</option>
                  <option>Hovenier</option>
                  <option>Schildersbedrijf</option>
                  <option>Aannemer</option>
                  <option>Dakdekker</option>
                  <option>Timmerman</option>
                  <option>Anders</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vraag of opmerking</label>
                <textarea
                  name="bericht"
                  rows={4}
                  placeholder="Vertel ons kort wat je zoekt, of stel een vraag..."
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors text-base"
              >
                Verstuur bericht →
              </button>
              <p className="text-xs text-slate-400 text-center">
                Wij bellen je terug op een moment dat jou uitkomt.
              </p>
            </form>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-6">
            {/* Direct contact */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Direct contact</h3>
              <div className="space-y-4">
                <a
                  href="tel:0600000000"
                  className="flex items-center gap-3 text-slate-700 hover:text-orange-600 transition-colors group"
                >
                  <span className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    📞
                  </span>
                  <div>
                    <div className="font-semibold text-sm group-hover:underline">06-00 000 000</div>
                    <div className="text-xs text-slate-500">Ma–vr 8:00–18:00</div>
                  </div>
                </a>
                <a
                  href="https://wa.me/31600000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-slate-700 hover:text-green-600 transition-colors group"
                >
                  <span className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    💬
                  </span>
                  <div>
                    <div className="font-semibold text-sm group-hover:underline">WhatsApp ons</div>
                    <div className="text-xs text-slate-500">Reageren binnen 2 uur</div>
                  </div>
                </a>
                <a
                  href="mailto:info@vakwebtwente.nl"
                  className="flex items-center gap-3 text-slate-700 hover:text-orange-600 transition-colors group"
                >
                  <span className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    ✉️
                  </span>
                  <div>
                    <div className="font-semibold text-sm group-hover:underline">info@vakwebtwente.nl</div>
                    <div className="text-xs text-slate-500">Reactie binnen 1 werkdag</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Wat kun je verwachten */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Wat kun je verwachten?</h3>
              <ol className="space-y-3">
                {[
                  "Wij bellen je terug binnen 1 werkdag",
                  "Korte kennismaking van 20 minuten (telefoon of video)",
                  "Binnen 5 werkdagen staat jouw website live",
                ].map((stap, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {stap}
                  </li>
                ))}
              </ol>
            </div>

            {/* Geen verplichtingen */}
            <div className="border border-slate-200 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">🤝</div>
              <p className="text-slate-700 font-semibold text-sm mb-1">
                Geen verplichtingen
              </p>
              <p className="text-slate-500 text-xs leading-relaxed">
                Het eerste gesprek is altijd gratis en vrijblijvend. Als het geen match is, prima — geen gedoe.
              </p>
            </div>

            {/* Demo CTA */}
            <div className="text-center">
              <p className="text-slate-500 text-sm mb-3">Nog niet overtuigd?</p>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 border border-orange-400 text-orange-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors text-sm"
              >
                Bekijk de live demo →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
