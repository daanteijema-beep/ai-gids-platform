-- Content insights: trend data per niche van Apify/Reddit/Firecrawl
create table if not exists content_insights (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  niche_id uuid references niches(id) on delete cascade,
  bron text not null check (bron in ('google_trends', 'linkedin', 'reddit', 'concurrent')),
  zoekterm text,
  titel text,
  samenvatting text,
  ruwe_data jsonb,
  relevantie_score integer check (relevantie_score between 0 and 10),
  aanbevolen_hook text,         -- "Meest gebruikte opener die werkt voor deze niche"
  week text                     -- bijv. "2026-W15" voor wekelijkse deduplicatie
);

alter table content_insights enable row level security;
