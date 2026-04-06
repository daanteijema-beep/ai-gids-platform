-- Add images column to pdfs table for storing generated image URLs
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '{}'::jsonb;
