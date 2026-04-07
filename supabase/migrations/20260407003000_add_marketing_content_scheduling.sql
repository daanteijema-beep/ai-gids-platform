alter table if exists marketing_content
  add column if not exists scheduled_date date,
  add column if not exists published_at timestamptz,
  add column if not exists platform text;

update marketing_content
set
  scheduled_date = coalesce(scheduled_date, created_at::date),
  platform = coalesce(
    platform,
    case type
      when 'cold_email_sequence' then 'email'
      when 'linkedin_posts' then 'linkedin'
      when 'instagram_posts' then 'instagram'
      when 'landing_page_copy' then 'website'
      when 'whatsapp_script' then 'whatsapp'
      else null
    end
  )
where scheduled_date is null
   or platform is null;

create index if not exists idx_marketing_content_scheduled_date
  on marketing_content (scheduled_date desc nulls last);
