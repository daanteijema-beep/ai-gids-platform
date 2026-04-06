-- Harden exposed public tables that are only used server-side.
-- Service role requests keep working because they bypass RLS.

alter table if exists brand_assets enable row level security;
alter table if exists market_knowledge enable row level security;

-- content_insights already has RLS in an earlier migration, but keep this idempotent
-- so fresh environments are protected even if migration order changes.
alter table if exists content_insights enable row level security;
