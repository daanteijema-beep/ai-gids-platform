# VakwebTwente — Full Build Prompt

## Wat je bouwt

Een complete Next.js 16 website voor **VakwebTwente** — een B2B-dienst die aanvraagmachines (website + slimme aanvraagflow) verkoopt aan Twentse vakbedrijven voor €79–€149/maand.

De website heeft twee doelen:
1. **Inbound**: Vakbedrijven landen op de site, raken overtuigd en vragen een gesprek aan.
2. **Outreach-agent**: Een automatisch systeem dat proactief vakbedrijven in Twente vindt, beoordeelt en benadert namens VakwebTwente.

---

## Tech stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL) — voor leads en outreach-status
- **E-mail**: Resend — voor notificaties en outreach-mails
- **AI-agent**: Vercel AI SDK + Claude claude-sonnet-4-6 — voor de outreach-agent
- **Cron**: Vercel Cron Jobs — om de agent dagelijks te draaien
- **Deployment**: Vercel

Installeer dependencies:
```bash
npm install @supabase/supabase-js resend ai @anthropic-ai/sdk
```

Environment variables (`.env.local`):
```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
RESEND_API_KEY=...
ANTHROPIC_API_KEY=...
OWNER_EMAIL=jouw@email.nl
OWNER_WHATSAPP=31600000000
CRON_SECRET=willekeurige-string
```

---

## Bestandsstructuur

```
app/
  page.tsx                  # Homepage landingspagina
  layout.tsx                # Root layout met Nav + Footer
  globals.css               # Tailwind + scroll-behavior
  demo/page.tsx             # Live demo: Installatiebedrijf De Boer
  prijzen/page.tsx          # Prijzenpagina met FAQ
  contact/page.tsx          # Contactpagina met formulier
  privacy/page.tsx          # Privacyverklaring
  api/
    contact/route.ts        # POST: sla lead op + stuur notificatie
    outreach/route.ts       # POST: start outreach-agent (cron)
    outreach/status/route.ts # GET: bekijk outreach pipeline

components/
  Nav.tsx                   # Sticky nav met mobile hamburger
  Footer.tsx                # Footer met links
  AanvraagFlow.tsx          # Interactieve 3-staps aanvraagflow (client)
```

---

## Database schema (Supabase)

Voer uit in de Supabase SQL editor:

```sql
-- Inbound leads (van contactformulier + aanvraagflow)
create table leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  naam text not null,
  bedrijf text,
  telefoon text not null,
  email text,
  sector text,
  bericht text,
  bron text default 'contactformulier', -- 'contactformulier' | 'aanvraagflow' | 'outreach'
  status text default 'nieuw'           -- 'nieuw' | 'gebeld' | 'klant' | 'afgewezen'
);

-- Outreach pipeline (bedrijven die de agent heeft gevonden)
create table outreach_targets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  bedrijfsnaam text not null,
  sector text,
  plaats text,
  website text,
  email text,
  telefoon text,
  website_score integer,       -- 0-10: hoe slecht is hun huidige site?
  agent_notitie text,          -- AI-analyse waarom dit een goede lead is
  status text default 'gevonden', -- 'gevonden' | 'mail_verstuurd' | 'gereageerd' | 'afgewezen'
  mail_verstuurd_op timestamptz,
  follow_up_op date
);

-- Row Level Security: alleen service key heeft toegang
alter table leads enable row level security;
alter table outreach_targets enable row level security;
```

---

## API routes

### `app/api/contact/route.ts`

Verwerkt het contactformulier. Slaat de lead op in Supabase en stuurt een notificatie naar de eigenaar.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { naam, bedrijf, telefoon, email, sector, bericht } = body;

  if (!naam || !telefoon) {
    return NextResponse.json({ error: "Naam en telefoon zijn verplicht" }, { status: 400 });
  }

  // Sla op in Supabase
  const { error } = await supabase.from("leads").insert({
    naam, bedrijf, telefoon, email, sector, bericht, bron: "contactformulier",
  });

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  // Stuur notificatie naar eigenaar
  await resend.emails.send({
    from: "VakwebTwente <noreply@vakwebtwente.nl>",
    to: process.env.OWNER_EMAIL!,
    subject: `Nieuwe aanvraag van ${naam} — ${bedrijf || sector || "onbekend"}`,
    html: `
      <h2>Nieuwe aanvraag via VakwebTwente</h2>
      <p><strong>Naam:</strong> ${naam}</p>
      <p><strong>Bedrijf:</strong> ${bedrijf || "—"}</p>
      <p><strong>Telefoon:</strong> <a href="tel:${telefoon}">${telefoon}</a></p>
      <p><strong>E-mail:</strong> ${email || "—"}</p>
      <p><strong>Sector:</strong> ${sector || "—"}</p>
      <p><strong>Bericht:</strong><br>${bericht || "—"}</p>
      <hr>
      <a href="https://vakwebtwente.nl/admin">Bekijk alle leads →</a>
    `,
  });

  return NextResponse.json({ ok: true });
}
```

### `app/api/outreach/route.ts`

De outreach-agent. Wordt elke werkdag om 09:00 getriggerd door een Vercel Cron Job.

De agent doet het volgende:
1. Zoekt via Google Places API naar vakbedrijven in Twentse plaatsen zonder goede website
2. Beoordeelt met Claude of een bedrijf een goede prospect is
3. Schrijft een gepersonaliseerde e-mail
4. Verstuurt de mail via Resend
5. Slaat alles op in `outreach_targets`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Vercel Cron: beveilig de route
function isAuthorized(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

const TWENTSE_PLAATSEN = ["Enschede", "Hengelo", "Almelo", "Oldenzaal", "Borne", "Haaksbergen", "Losser", "Rijssen"];
const SECTOREN = ["installatiebedrijf", "loodgieter", "elektricien", "hovenier", "schildersbedrijf", "dakdekker"];

async function zoekBedrijven(plaats: string, sector: string): Promise<Array<{
  naam: string; adres: string; telefoon?: string; website?: string; rating?: number;
}>> {
  // Gebruik Google Places API (Text Search)
  const query = `${sector} ${plaats} Nederland`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${process.env.GOOGLE_PLACES_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  
  return (data.results || []).slice(0, 5).map((p: Record<string, unknown>) => ({
    naam: p.name as string,
    adres: p.formatted_address as string,
    website: (p as Record<string, unknown>).website as string | undefined,
    telefoon: (p as Record<string, unknown>).formatted_phone_number as string | undefined,
    rating: p.rating as number | undefined,
  }));
}

async function beoordeelProspect(bedrijf: { naam: string; sector: string; website?: string }): Promise<{
  score: number; notitie: string; mailen: boolean;
}> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Je bent een sales-assistent voor VakwebTwente, een dienst die professionele websites met aanvraagflows bouwt voor Twentse vakbedrijven (€79–€149/maand).

Beoordeel of dit bedrijf een goede prospect is:
- Naam: ${bedrijf.naam}
- Sector: ${bedrijf.sector}
- Website: ${bedrijf.website || "GEEN WEBSITE"}

Geef een JSON-object terug:
{
  "score": 0-10,  // 10 = perfecte prospect (geen of slechte website, actief vakbedrijf)
  "notitie": "korte uitleg waarom",
  "mailen": true/false  // true als score >= 6
}

Alleen JSON, geen uitleg eromheen.`,
    }],
  });

  try {
    return JSON.parse((message.content[0] as { text: string }).text);
  } catch {
    return { score: 5, notitie: "Analyse mislukt", mailen: false };
  }
}

async function schrijfOutreachMail(bedrijf: { naam: string; sector: string; plaats: string }): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `Schrijf een korte, persoonlijke outreach-mail namens VakwebTwente aan ${bedrijf.naam}, een ${bedrijf.sector} in ${bedrijf.plaats}.

VakwebTwente bouwt professionele websites met slimme aanvraagflows voor Twentse vakbedrijven. Klanten vinden het bedrijf via Google en kunnen in 3 stappen een aanvraag sturen. Prijs: €79–€149/maand.

Eisen:
- Maximaal 5 zinnen
- Informeel maar professioneel (jij-vorm)
- Specifiek voor hun sector en regio
- Eindig met een concrete uitnodiging voor een gratis gesprek van 20 minuten
- Geen spam-taal, geen overdreven beloftes
- Sluit af met: "Met vriendelijke groet, Daan van VakwebTwente | 06-00 000 000"

Alleen de mail-body, geen onderwerpregel.`,
    }],
  });

  return (message.content[0] as { text: string }).text;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resultaten: Array<{ bedrijf: string; actie: string }> = [];

  // Draai voor 1 willekeurige combinatie per run (om rate limits te vermijden)
  const plaats = TWENTSE_PLAATSEN[Math.floor(Math.random() * TWENTSE_PLAATSEN.length)];
  const sector = SECTOREN[Math.floor(Math.random() * SECTOREN.length)];

  const bedrijven = await zoekBedrijven(plaats, sector);

  for (const bedrijf of bedrijven) {
    // Sla over als we dit bedrijf al kennen
    const { data: bestaand } = await supabase
      .from("outreach_targets")
      .select("id")
      .eq("bedrijfsnaam", bedrijf.naam)
      .single();

    if (bestaand) continue;

    const beoordeling = await beoordeelProspect({ naam: bedrijf.naam, sector, website: bedrijf.website });

    // Sla op in database
    const { data: target } = await supabase.from("outreach_targets").insert({
      bedrijfsnaam: bedrijf.naam,
      sector,
      plaats,
      website: bedrijf.website,
      telefoon: bedrijf.telefoon,
      website_score: beoordeling.score,
      agent_notitie: beoordeling.notitie,
      status: "gevonden",
    }).select().single();

    if (beoordeling.mailen && bedrijf.website) {
      // Zoek e-mailadres via website (simpele heuristic: info@domein)
      try {
        const domein = new URL(bedrijf.website).hostname.replace("www.", "");
        const email = `info@${domein}`;
        const mailBody = await schrijfOutreachMail({ naam: bedrijf.naam, sector, plaats });

        await resend.emails.send({
          from: "Daan van VakwebTwente <daan@vakwebtwente.nl>",
          to: email,
          subject: `Meer aanvragen voor ${bedrijf.naam}?`,
          text: mailBody,
        });

        // Update status
        if (target) {
          await supabase.from("outreach_targets")
            .update({ status: "mail_verstuurd", email, mail_verstuurd_op: new Date().toISOString() })
            .eq("id", target.id);
        }

        resultaten.push({ bedrijf: bedrijf.naam, actie: `mail verstuurd naar ${email}` });
      } catch {
        resultaten.push({ bedrijf: bedrijf.naam, actie: "gevonden maar geen mail (domein fout)" });
      }
    } else {
      resultaten.push({ bedrijf: bedrijf.naam, actie: `gevonden, score ${beoordeling.score} — niet gemaild` });
    }
  }

  return NextResponse.json({ plaats, sector, resultaten });
}
```

---

## Vercel Cron Job (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/outreach",
      "schedule": "0 8 * * 1-5"
    }
  ]
}
```

Roep de route aan met de `Authorization: Bearer <CRON_SECRET>` header. Vercel doet dit automatisch.

---

## Contactformulier aanpassen (client-side)

Vervang het Formspree-formulier in `app/contact/page.tsx` door een eigen `handleSubmit` die naar `/api/contact` POST:

```typescript
"use client";
import { useState } from "react";

// Bovenin de component:
const [status, setStatus] = useState<"idle" | "loading" | "succes" | "fout">("idle");

async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setStatus("loading");
  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form));

  const res = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  setStatus(res.ok ? "succes" : "fout");
}
```

Vervang `<form action="...">` door `<form onSubmit={handleSubmit}>` en voeg statusfeedback toe.

---

## AanvraagFlow: leads opslaan

In `components/AanvraagFlow.tsx`, update de `verstuur` functie:

```typescript
async function verstuur() {
  await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      naam,
      telefoon,
      bericht: `Dienst: ${dienst} | Urgentie: ${hoeUrgent} | Woonplaats: ${plaats}`,
      bron: "aanvraagflow",
    }),
  });
  setVerzonden(true);
  setStap(4);
}
```

---

## Outreach uitbreiden: Google Places API

Voeg toe aan `.env.local`:
```
GOOGLE_PLACES_KEY=...
```

Haal een sleutel op via Google Cloud Console → Places API inschakelen.

---

## Deployment checklist

1. `vercel` installeren en inloggen
2. Supabase project aanmaken, schema uitvoeren
3. Resend account + domein verifiëren (`vakwebtwente.nl`)
4. Alle env vars toevoegen in Vercel dashboard
5. `vercel deploy`
6. Cron job wordt automatisch actief via `vercel.json`

---

## Wat de outreach-agent elke werkdag doet

1. Kiest een willekeurige Twentse stad + sector
2. Zoekt 5 bedrijven via Google Places
3. Beoordeelt elk bedrijf met Claude (heeft het een slechte/geen site?)
4. Schrijft een gepersonaliseerde mail voor kansrijke bedrijven
5. Verstuurt de mail via Resend
6. Logt alles in Supabase (`outreach_targets`)

Je opent `outreach_targets` in Supabase of bouw een `/admin`-pagina om de pipeline bij te houden.

---

## Optionele uitbreidingen

- **WhatsApp outreach**: Gebruik Twilio WhatsApp API naast e-mail
- **Follow-up agent**: Stuur automatisch een follow-up na 3 dagen zonder reactie
- **Admin dashboard**: `/admin`-route met tabel van alle leads + outreach-status (beveiligd met NextAuth of een simpele passcode)
- **Meer databronnen**: KvK Open Data, LinkedIn Sales Navigator, lokale gidsen (detelefoongids.nl)
- **A/B testen**: Laat de agent meerdere mail-varianten schrijven en track reply rates
