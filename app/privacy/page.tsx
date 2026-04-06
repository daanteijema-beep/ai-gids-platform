import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacyverklaring – VakwebTwente",
  description: "Hoe VakwebTwente omgaat met jouw persoonsgegevens.",
};

export default function PrivacyPage() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto prose prose-slate">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Privacyverklaring</h1>
        <p className="text-slate-500 text-sm mb-10">Laatst bijgewerkt: april 2026</p>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Wie zijn wij?</h2>
            <p>
              VakwebTwente is een dienst van [Bedrijfsnaam], gevestigd in Enschede. Wij bouwen professionele websites met aanvraagflows voor vakbedrijven in de regio Twente.
            </p>
            <p className="mt-2">
              KVK-nummer: 12345678<br />
              E-mail: <a href="mailto:info@vakwebtwente.nl" className="text-orange-600 underline">info@vakwebtwente.nl</a>
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Welke gegevens verzamelen wij?</h2>
            <p>Wij verzamelen alleen gegevens die je zelf aan ons verstrekt via het contactformulier of de aanvraagflow:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Naam</li>
              <li>Telefoonnummer</li>
              <li>E-mailadres</li>
              <li>Bedrijfsnaam (optioneel)</li>
              <li>Je bericht of aanvraag</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Waarvoor gebruiken wij jouw gegevens?</h2>
            <p>Uitsluitend om contact met je op te nemen naar aanleiding van jouw aanvraag of vraag. Wij verkopen jouw gegevens nooit aan derden en gebruiken ze niet voor marketingdoeleinden zonder jouw toestemming.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Hoe lang bewaren wij jouw gegevens?</h2>
            <p>Wij bewaren jouw gegevens zo lang als nodig is om jou te helpen, of zo lang als de wet vereist. Na afloop van een samenwerking verwijderen wij jouw persoonsgegevens binnen 12 maanden.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Jouw rechten</h2>
            <p>Je hebt het recht om jouw gegevens in te zien, te corrigeren of te laten verwijderen. Neem daarvoor contact op via <a href="mailto:info@vakwebtwente.nl" className="text-orange-600 underline">info@vakwebtwente.nl</a>. Wij reageren binnen 30 dagen.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Cookies</h2>
            <p>Wij maken gebruik van functionele cookies die noodzakelijk zijn voor het goed functioneren van de website. Wij plaatsen geen tracking- of advertentiecookies zonder jouw toestemming.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Vragen?</h2>
            <p>Heb je vragen over deze privacyverklaring? Stuur een e-mail naar <a href="mailto:info@vakwebtwente.nl" className="text-orange-600 underline">info@vakwebtwente.nl</a>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
