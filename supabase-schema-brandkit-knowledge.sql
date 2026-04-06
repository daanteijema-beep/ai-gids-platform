-- ============================================================
-- BRAND ASSETS — Pexels foto's/video's pre-fetched per thema
-- ============================================================
create table if not exists brand_assets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  type text check (type in ('photo', 'video')) default 'photo',
  zoekterm text not null,                    -- de zoekterm waarmee dit gevonden is
  pexels_id text,                            -- Pexels ID voor deduplicatie
  url text not null,                         -- full-res URL
  thumbnail_url text,                        -- klein preview
  alt text,                                  -- alt tekst / beschrijving
  breedte integer,
  hoogte integer,
  platform text check (platform in ('linkedin', 'meta', 'instagram', 'general')) default 'general',
  tags text[] default '{}',                  -- bijv. ['ondernemer', 'technologie', 'kantoor']
  gebruik_count integer default 0           -- hoe vaak gebruikt in content posts
);

create index if not exists idx_brand_assets_zoekterm on brand_assets(zoekterm);
create index if not exists idx_brand_assets_platform on brand_assets(platform);
create index if not exists idx_brand_assets_tags on brand_assets using gin(tags);

-- ============================================================
-- MARKET KNOWLEDGE — Interessante marktinzichten per run
-- ============================================================
create table if not exists market_knowledge (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  run_id uuid references pipeline_runs(id) on delete set null,
  bron text not null,                        -- reddit, producthunt, linkedin, google_trends
  categorie text check (categorie in ('pijnpunt', 'trend', 'tool', 'sector', 'statistiek', 'citaat')) default 'pijnpunt',
  titel text not null,
  inhoud text not null,                      -- volledig tekstfragment
  zoekterm text,                             -- welke zoekterm dit opleverde
  relevantie_score integer check (relevantie_score between 1 and 10),
  tags text[] default '{}',                  -- bijv. ['loodgieter', 'offertes', 'tijdsverspilling']
  al_gebruikt boolean default false          -- is dit al als basis voor een idee gebruikt?
);

create index if not exists idx_market_knowledge_bron on market_knowledge(bron);
create index if not exists idx_market_knowledge_categorie on market_knowledge(categorie);
create index if not exists idx_market_knowledge_tags on market_knowledge using gin(tags);
create index if not exists idx_market_knowledge_gebruikt on market_knowledge(al_gebruikt);
