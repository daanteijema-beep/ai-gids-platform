-- AI Gids Platform — Supabase Schema
-- Voer uit in de Supabase SQL Editor (sudpvngrkbpopfaerguw)

-- PDF ideeën voorgesteld door de research agent
create table if not exists pdf_ideas (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'published')),
  niche text not null,
  title text not null,
  subtitle text,
  target_audience text,
  problem_solved text,
  estimated_price numeric(6,2) not null default 12,
  research_rationale text,
  agent_confidence_score integer default 50,
  form_fields jsonb default '[]'::jsonb
);

-- Gepubliceerde PDF producten
create table if not exists pdfs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  idea_id uuid references pdf_ideas(id),
  title text not null,
  subtitle text,
  description text,
  price numeric(6,2) not null,
  stripe_product_id text,
  stripe_price_id text,
  slug text unique not null,
  form_fields jsonb default '[]'::jsonb,
  active boolean default true
);

-- Dynamisch gegenereerde landingspagina content
create table if not exists landing_pages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  pdf_id uuid references pdfs(id) on delete cascade,
  hero_headline text,
  hero_subtext text,
  pain_points jsonb default '[]'::jsonb,
  benefits jsonb default '[]'::jsonb,
  social_proof jsonb default '[]'::jsonb,
  faq jsonb default '[]'::jsonb,
  generated_at timestamptz default now()
);

-- Bestellingen (pre- en post-payment)
create table if not exists pdf_orders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  pdf_id uuid references pdfs(id),
  stripe_session_id text,
  customer_email text not null,
  customer_name text not null,
  customer_inputs jsonb default '{}'::jsonb,
  generated_pdf_content text,
  email_sent boolean default false,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'generated', 'delivered'))
);

-- Social media posts kalender
create table if not exists social_posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  pdf_id uuid references pdfs(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'linkedin', 'tiktok')),
  post_type text not null check (post_type in ('awareness', 'interest', 'conversion')),
  content_text text not null,
  hashtags jsonb default '[]'::jsonb,
  visual_description text,
  scheduled_date date not null,
  status text not null default 'planned' check (status in ('planned', 'published'))
);

-- Analytics snapshots per PDF
create table if not exists pdf_analytics (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  pdf_id uuid references pdfs(id) on delete cascade,
  stripe_total_sales integer default 0,
  stripe_revenue numeric(10,2) default 0,
  landing_page_views integer default 0,
  landing_page_conversion_rate numeric(5,2) default 0,
  social_total_reach integer default 0,
  social_total_engagement integer default 0
);

-- Wat de monitoring agent heeft geleerd
create table if not exists agent_learnings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  learning_type text not null check (learning_type in ('niche_performance', 'price_sensitivity', 'platform_roi', 'general')),
  insight text not null,
  data_points jsonb default '{}'::jsonb
);

-- Leads (email captures op landingspagina's)
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  email text unique not null,
  name text,
  pdf_id uuid references pdfs(id),
  source text default 'landing_page'
);

-- Indexes voor performance
create index if not exists idx_pdfs_slug on pdfs(slug);
create index if not exists idx_pdfs_active on pdfs(active);
create index if not exists idx_pdf_orders_pdf_id on pdf_orders(pdf_id);
create index if not exists idx_pdf_orders_status on pdf_orders(status);
create index if not exists idx_social_posts_pdf_id on social_posts(pdf_id);
create index if not exists idx_social_posts_scheduled on social_posts(scheduled_date);
create index if not exists idx_pdf_ideas_status on pdf_ideas(status);

-- RLS policies (alle tabellen toegankelijk via service role key)
alter table pdf_ideas enable row level security;
alter table pdfs enable row level security;
alter table landing_pages enable row level security;
alter table pdf_orders enable row level security;
alter table social_posts enable row level security;
alter table pdf_analytics enable row level security;
alter table agent_learnings enable row level security;
alter table leads enable row level security;

-- Service role bypasses RLS automatisch
-- Publieke read access voor pdfs en landing_pages (voor de website)
create policy "Public can read active pdfs" on pdfs for select using (active = true);
create policy "Public can read landing pages" on landing_pages for select using (true);
