-- VakwebTwente — Supabase Schema
-- Voer uit in de Supabase SQL Editor

-- ============================================================
-- NICHES / DOELGROEPEN
-- ============================================================
create table if not exists niches (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  naam text not null,                    -- "Loodgieters"
  slug text unique not null,             -- "loodgieters"
  sector_zoekterm text not null,         -- "loodgieter" (voor Google Places)
  beschrijving text,
  prijs_basis numeric default 79,
  prijs_pro numeric default 149,
  actief boolean default true,
  icon text default '🔧',
  kleur text default 'orange'
);

-- Startdata: Twentse vakbedrijven
insert into niches (naam, slug, sector_zoekterm, beschrijving, icon) values
  ('Loodgieters', 'loodgieters', 'loodgieter', 'Loodgietersbedrijven in Twente en omgeving', '🔧'),
  ('Installateurs', 'installateurs', 'installatiebedrijf', 'CV/elektra installatiebedrijven', '⚡'),
  ('Elektriciens', 'elektriciens', 'elektricien', 'Elektrische installatiebedrijven', '💡'),
  ('Schilders', 'schilders', 'schildersbedrijf', 'Schilders- en afwerkingsbedrijven', '🎨'),
  ('Hoveniërs', 'hoveniers', 'hovenier', 'Hovenier- en tuinaanlegbedrijven', '🌱'),
  ('Dakdekkers', 'dakdekkers', 'dakdekker', 'Dakdekkings- en dakonderhoudsbedrijven', '🏠'),
  ('Schoonmaakbedrijven', 'schoonmaak', 'schoonmaakbedrijf', 'Schoonmaak- en facilitaire dienstverlening', '✨'),
  ('Klusbedrijven', 'klusbedrijven', 'klusbedrijf', 'Algemene klusbedrijven en aannemers', '🔨')
on conflict (slug) do nothing;

-- ============================================================
-- INBOUND LEADS (van contactformulier / aanvraagflow)
-- ============================================================
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  naam text not null,
  bedrijf text,
  telefoon text not null,
  email text,
  sector text,
  bericht text,
  niche_id uuid references niches(id),
  bron text default 'contactformulier',  -- 'contactformulier' | 'aanvraagflow' | 'demo'
  status text default 'nieuw' check (status in ('nieuw', 'gebeld', 'demo', 'klant', 'afgewezen'))
);

-- ============================================================
-- OUTREACH PIPELINE (door AI gevonden bedrijven)
-- ============================================================
create table if not exists outreach_targets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  bedrijfsnaam text not null,
  niche_id uuid references niches(id),
  sector text,
  plaats text,
  website text,
  email text,
  telefoon text,
  website_score integer,                 -- 0-10: hoe slecht is hun huidige site?
  agent_notitie text,                    -- AI-analyse waarom goede lead
  outreach_mail text,                    -- de verstuurde mail
  status text default 'gevonden' check (
    status in ('gevonden', 'mail_verstuurd', 'gereageerd', 'demo_gepland', 'klant', 'afgewezen')
  ),
  mail_verstuurd_op timestamptz,
  follow_up_op date
);

-- ============================================================
-- AI-GEGENEREERDE MARKETING CONTENT PER NICHE
-- ============================================================
create table if not exists marketing_content (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  niche_id uuid references niches(id) on delete cascade,
  type text not null check (
    type in ('cold_email_sequence', 'linkedin_posts', 'instagram_posts', 'landing_page_copy', 'whatsapp_script')
  ),
  titel text,
  content jsonb not null,               -- array van berichten / posts / secties
  status text default 'draft' check (status in ('draft', 'actief', 'gearchiveerd'))
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table niches enable row level security;
alter table leads enable row level security;
alter table outreach_targets enable row level security;
alter table marketing_content enable row level security;

-- Service key bypasses RLS — geen extra policies nodig voor server-side gebruik
