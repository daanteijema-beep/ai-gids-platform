-- Voeg VakwebTwente-specifieke kolommen toe aan de bestaande leads tabel.
-- De tabel had alleen PDF-platform kolommen (name, email, pdf_id, source).
-- Bestaande data blijft intact.

alter table public.leads
  add column if not exists naam text,
  add column if not exists bedrijf text,
  add column if not exists telefoon text,
  add column if not exists sector text,
  add column if not exists bericht text,
  add column if not exists niche_id uuid references public.niches(id),
  add column if not exists bron text default 'contactformulier',
  add column if not exists status text default 'nieuw'
    check (status in ('nieuw', 'gebeld', 'demo', 'klant', 'afgewezen'));
