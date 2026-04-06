import type { Metadata } from "next";
import Link from "next/link";
import AanvraagFlow from "@/components/AanvraagFlow";

export const metadata: Metadata = {
  title: "Live Demo – Installatiebedrijf De Boer | VakwebTwente",
  description: "Bekijk een live demo van de aanvraagmachine die VakwebTwente bouwt voor installatiebedrijven in Twente.",
};

export default function DemoPage() {
  return (
    <>
      {/* FRAMING BANNER */}
      <div className="bg-orange-500 text-white text-center px-4 py-3 text-sm font-medium">
        Dit is een live demo van VakwebTwente — zo ziet jouw aanvraagmachine eruit.{" "}
        <Link href="/contact" className="underline font-bold hover:no-underline">
          Wil jij dit ook? →
        </Link>
      </div>

      {/* DEMO WEBSITE */}
      <div className="bg-slate-800 text-white">
        {/* Demo-nav (gesimuleerd) */}
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-lg">
            Installatiebedrijf <span className="text-orange-400">De Boer</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-slate-300">
            <span>CV-ketels</span>
            <span>Onderhoud</span>
            <span>Over ons</span>
          </div>
          <a href="tel:0612345678" className="text-sm font-semibold text-orange-400 hover:text-orange-300">
            📞 06-12 34 56 78
          </a>
        </div>
      </div>

      {/* DEMO HERO */}
      <section className="bg-gradient-to-br from-slate-700 to-slate-900 text-white px-4 sm:px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-block bg-orange-500/20 text-orange-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                Uw installateur in Hengelo en omgeving
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
                CV-ketel problemen?<br />
                <span className="text-orange-400">Wij lossen het op.</span>
              </h1>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Van storing verhelpen tot nieuw CV-systeem plaatsen. Al meer dan 15 jaar uw vertrouwde installateur in de regio.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="bg-orange-500 text-white text-sm font-bold px-5 py-3 rounded-xl text-center">
                  Stuur een aanvraag ↓
                </div>
                <a
                  href="tel:0612345678"
                  className="border border-white/30 text-white text-sm font-semibold px-5 py-3 rounded-xl text-center hover:bg-white/10 transition-colors"
                >
                  📞 Direct bellen
                </a>
              </div>
            </div>

            {/* AANVRAAGFLOW */}
            <div>
              <AanvraagFlow />
            </div>
          </div>
        </div>
      </section>

      {/* DEMO DIENSTEN */}
      <section className="py-14 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Onze diensten</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: "🔥", titel: "CV-ketel storing", tekst: "Spoed of niet — we plannen u zo snel mogelijk in." },
              { icon: "🔧", titel: "Onderhoud & service", tekst: "Jaarlijks onderhoud voorkomt storingen en verhoogt levensduur." },
              { icon: "♨️", titel: "Nieuwe installatie", tekst: "Advies en installatie van moderne CV-ketels en warmtepompen." },
            ].map((d) => (
              <div key={d.titel} className="border border-slate-100 rounded-xl p-5 hover:shadow-sm transition-shadow">
                <div className="text-3xl mb-3">{d.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{d.titel}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{d.tekst}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO OVER ONS */}
      <section className="py-14 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Over Installatiebedrijf De Boer</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Al meer dan 15 jaar helpen wij particulieren en bedrijven in Hengelo en omgeving met de installatie en het onderhoud van CV-systemen.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Wij werken snel, netjes en betrouwbaar. Geen verrassingen achteraf — gewoon goede service voor een eerlijke prijs.
            </p>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-orange-500">15+</div>
                <div className="text-slate-500">jaar ervaring</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extrabold text-orange-500">500+</div>
                <div className="text-slate-500">tevreden klanten</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extrabold text-orange-500">2 uur</div>
                <div className="text-slate-500">reactietijd</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-200 rounded-2xl h-64 flex items-center justify-center text-slate-400 text-sm">
            [Foto installateur]
          </div>
        </div>
      </section>

      {/* DEMO FOOTER (simplified) */}
      <div className="bg-slate-900 text-slate-400 text-sm py-6 px-4 text-center">
        Installatiebedrijf De Boer · Hengelo · 06-12 34 56 78 · info@deboerinstallaties.nl
      </div>

      {/* VAKWEBTWENTE CTA — terug naar eigen site */}
      <section className="py-16 px-4 sm:px-6 bg-orange-50 border-t-4 border-orange-500">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase">
            Dit was de demo van VakwebTwente
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            Wil jij ook zo&apos;n aanvraagmachine?
          </h2>
          <p className="text-slate-600 mb-8">
            Jouw versie staat binnen <strong>5 werkdagen live</strong> — met jouw naam, jouw diensten en jouw werkgebied. Elke aanvraag komt direct bij jou binnen via e-mail of WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Ja, ik wil dit ook →
            </Link>
            <Link
              href="/prijzen"
              className="border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold px-8 py-4 rounded-xl text-lg bg-white transition-colors"
            >
              Bekijk de prijzen
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
