create table if not exists pdf_templates (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  pdf_id uuid unique references pdfs(id) on delete cascade,
  niche text not null,
  tone_of_voice text not null,
  chapters jsonb not null default '[]'::jsonb,
  intro_template text not null,
  outro_template text not null,
  variable_map jsonb not null default '{}'::jsonb
);
