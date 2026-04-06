-- Add pre-generated PDF column (full HTML generated at approval, not at purchase time)
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS generated_pdf_html text;
