-- VakwebTwente — Pipeline Schema
-- Voer uit in de Supabase SQL Editor

-- ============================================================
-- PRODUCT IDEAS (Agent 1: Research output)
-- ============================================================
create table if not exists product_ideas (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  run_id uuid,                            -- gekoppeld aan pipeline_run (set achteraf)
  naam text not null,                     -- "AI Offerte Generator"
  tagline text,                           -- "Offertes in 30 seconden"
  beschrijving text,                      -- uitgebreide omschrijving
  doelgroep text,                         -- "Freelance bouwers, ZZP installateurs"
  pijnpunt text,                          -- "Uren kwijt aan offertes schrijven"
  type text default 'mini_tool' check (type in ('mini_tool', 'agent', 'website', 'saas')),
  prijsindicatie text,                    -- "€9/maand" of "€29 eenmalig"
  validatiescore integer default 5,       -- 1-10
  bronnen jsonb,                          -- welke bronnen zijn gebruikt
  geselecteerd boolean default false      -- heeft de user dit idee gekozen?
);

-- ============================================================
-- PIPELINE RUNS (Orchestrator state)
-- ============================================================
create table if not exists pipeline_runs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  product_idea_id uuid references product_ideas(id),
  huidige_stap integer default 1,         -- 1=research, 2=marketing, 3=landing, 4=content, 5=leads, 6=outreach
  status text default 'running' check (
    status in ('running', 'wacht_op_goedkeuring', 'afgewezen', 'voltooid')
  ),
  afgewezen_reden text,
  notitie text
);

-- FK terug van product_ideas naar pipeline_runs
alter table product_ideas add constraint fk_run
  foreign key (run_id) references pipeline_runs(id) on delete cascade;

-- ============================================================
-- MARKETING PLANS (Agent 2 output)
-- ============================================================
create table if not exists marketing_plans (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  run_id uuid references pipeline_runs(id) on delete cascade,
  product_idea_id uuid references product_ideas(id) on delete cascade,
  icp jsonb,                              -- ideal customer profile: sector, grootte, locatie, pijnpunten
  email_strategie jsonb,                  -- subject lines, sequentie, toon
  social_plan jsonb,                      -- platforms, post types, frequentie
  key_messages jsonb,                     -- 3-5 kernboodschappen
  zoekwoorden jsonb                       -- SEO zoekwoorden
);

-- ============================================================
-- LANDING PAGES (Agent 3 output)
-- ============================================================
create table if not exists landing_pages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  run_id uuid references pipeline_runs(id) on delete cascade,
  product_idea_id uuid references product_ideas(id) on delete cascade,
  slug text unique,                       -- /tools/ai-offerte-generator
  hero_headline text,
  hero_subline text,
  features jsonb,                         -- [{ icon, titel, tekst }]
  voordelen jsonb,                        -- bullet points
  faq jsonb,                              -- [{ vraag, antwoord }]
  cta_tekst text,
  meta_title text,
  meta_description text,
  stripe_product_id text,
  stripe_price_id text,
  prijs_in_cents integer,
  live boolean default false
);

-- ============================================================
-- CONTENT POSTS (Agent 4 output)
-- ============================================================
create table if not exists content_posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  run_id uuid references pipeline_runs(id) on delete cascade,
  product_idea_id uuid references product_ideas(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'meta', 'instagram')),
  afbeelding_url text,
  afbeelding_alt text,
  tekst text not null,
  hashtags jsonb,
  status text default 'concept' check (status in ('concept', 'gepland', 'geplaatst'))
);

-- ============================================================
-- PIPELINE LEADS (Agent 5 output — aparte tabel van VakwebTwente leads)
-- ============================================================
create table if not exists pipeline_leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  run_id uuid references pipeline_runs(id) on delete cascade,
  product_idea_id uuid references product_ideas(id) on delete cascade,
  bedrijfsnaam text not null,
  sector text,
  plaats text,
  website text,
  email text,
  telefoon text,
  linkedin_url text,
  bron text default 'google_maps',        -- 'google_maps' | 'linkedin' | 'handmatig'
  kwaliteit_score integer,                -- 1-10
  notitie text
);

-- ============================================================
-- OUTREACH QUEUE (Agent 6 output — wacht op goedkeuring)
-- ============================================================
create table if not exists outreach_queue (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  run_id uuid references pipeline_runs(id) on delete cascade,
  lead_id uuid references pipeline_leads(id) on delete cascade,
  product_idea_id uuid references product_ideas(id) on delete cascade,
  aan_naam text,
  aan_bedrijf text,
  aan_email text,
  onderwerp text not null,
  mail_body text not null,
  status text default 'wacht_op_goedkeuring' check (
    status in ('wacht_op_goedkeuring', 'goedgekeurd', 'verstuurd', 'afgewezen')
  ),
  verstuurd_op timestamptz
);

-- ============================================================
-- PIPELINE ANALYTICS (events per run/stap — voor leerlogica)
-- ============================================================
create table if not exists pipeline_analytics (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  run_id uuid references pipeline_runs(id) on delete cascade,
  product_idea_id uuid references product_ideas(id),
  event_type text not null check (event_type in (
    'run_gestart', 'idee_geselecteerd', 'stap_goedgekeurd', 'stap_afgewezen',
    'email_verstuurd', 'lead_gereageerd', 'conversie'
  )),
  stap integer,
  metadata jsonb                              -- reden afwijzing, conversie-data, etc.
);

-- ============================================================
-- CAMPAIGN LEARNINGS (wat werkte — input voor Research agent)
-- ============================================================
create table if not exists campaign_learnings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  run_id uuid references pipeline_runs(id),
  product_type text,                          -- mini_tool | agent | saas
  doelgroep text,
  beste_kanaal text,                          -- linkedin | meta | email | google
  wat_werkte text,
  wat_niet_werkte text,
  email_open_rate numeric,
  conversie_rate numeric,
  totaal_leads integer,
  totaal_reacties integer,
  notities jsonb
);

-- ============================================================
-- RLS
-- ============================================================
alter table product_ideas enable row level security;
alter table pipeline_runs enable row level security;
alter table marketing_plans enable row level security;
alter table landing_pages enable row level security;
alter table content_posts enable row level security;
alter table pipeline_leads enable row level security;
alter table outreach_queue enable row level security;
alter table pipeline_analytics enable row level security;
alter table campaign_learnings enable row level security;
