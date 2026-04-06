## Setup

Create a `.env.local` based on `.env.example` and make sure these Supabase variables are set:

```bash
NEXT_PUBLIC_APP_URL="https://vakwebtwente.vercel.app"
NEXT_PUBLIC_SUPABASE_URL="https://knagzemkqtjuenlmkeff.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
CRON_SECRET="..."
DASHBOARD_PASSWORD="..."
DASHBOARD_SESSION_SECRET="..."
```

The app accepts the new Supabase publishable key by default and still falls back to the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` if needed.

`vercel.json` cron jobs should use the plain route path only. Vercel adds the `Authorization: Bearer <CRON_SECRET>` header automatically when `CRON_SECRET` is configured in the project environment.

Dashboard toegang loopt nu via `/dashboard-access` met een server-set `httpOnly` sessiecookie. Gebruik dus een apart `DASHBOARD_PASSWORD` en houd `DASHBOARD_SESSION_SECRET` los van je cron secret zodat dashboard-acties niet meer afhankelijk zijn van secrets in client-side code.

The workspace MCP config is pinned to the same Supabase project ref as the linked CLI project, so local tooling stays aligned with the app code and migrations.

## Getting Started

Run the development server:

```bash
npm run dev
```
