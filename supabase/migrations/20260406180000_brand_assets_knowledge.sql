-- Brand assets: pre-fetched Pexels foto's
create table if not exists brand_assets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  type text check (type in ('photo', 'video')) default 'photo',
  zoekterm text not null,
  pexels_id text,
  url text not null,
  thumbnail_url text,
  alt text,
  breedte integer,
  hoogte integer,
  platform text check (platform in ('linkedin', 'meta', 'instagram', 'general')) default 'general',
  tags text[] default '{}',
  gebruik_count integer default 0
);

create index if not exists idx_brand_assets_zoekterm on brand_assets(zoekterm);
create index if not exists idx_brand_assets_platform on brand_assets(platform);
create index if not exists idx_brand_assets_tags on brand_assets using gin(tags);

-- Market knowledge: interessante inzichten opgeslagen door research agent
create table if not exists market_knowledge (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  run_id uuid references pipeline_runs(id) on delete set null,
  bron text not null,
  categorie text check (categorie in ('pijnpunt', 'trend', 'tool', 'sector', 'statistiek', 'citaat')) default 'pijnpunt',
  titel text not null,
  inhoud text not null,
  zoekterm text,
  relevantie_score integer check (relevantie_score between 1 and 10),
  tags text[] default '{}',
  al_gebruikt boolean default false
);

create index if not exists idx_market_knowledge_bron on market_knowledge(bron);
create index if not exists idx_market_knowledge_categorie on market_knowledge(categorie);
create index if not exists idx_market_knowledge_tags on market_knowledge using gin(tags);
create index if not exists idx_market_knowledge_gebruikt on market_knowledge(al_gebruikt);
