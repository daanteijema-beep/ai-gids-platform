-- Voeg product_type toe aan pdf_ideas
ALTER TABLE pdf_ideas
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'swipe_file'
    CHECK (product_type IN ('swipe_file', 'playbook', 'toolkit'));

-- Voeg meta_hook toe (gebruikt door research agent)
ALTER TABLE pdf_ideas
  ADD COLUMN IF NOT EXISTS meta_hook text;
