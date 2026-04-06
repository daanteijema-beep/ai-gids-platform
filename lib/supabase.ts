import { createClient } from '@supabase/supabase-js'
import {
  getSupabaseClientKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from '@/lib/env'

const supabaseUrl = getSupabaseUrl()
const supabaseClientKey = getSupabaseClientKey()
const supabaseServiceKey = getSupabaseServiceRoleKey()

export const supabase = createClient(supabaseUrl, supabaseClientKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// ============================================================
// VAKWEBTWENTE TYPES
// ============================================================

export type Niche = {
  id: string
  created_at: string
  naam: string
  slug: string
  sector_zoekterm: string
  beschrijving: string | null
  prijs_basis: number
  prijs_pro: number
  actief: boolean
  icon: string
  kleur: string
}

export type Lead = {
  id: string
  created_at: string
  naam: string
  bedrijf: string | null
  telefoon: string
  email: string | null
  sector: string | null
  bericht: string | null
  niche_id: string | null
  bron: 'contactformulier' | 'aanvraagflow' | 'demo'
  status: 'nieuw' | 'gebeld' | 'demo' | 'klant' | 'afgewezen'
  niches?: Niche
}

export type OutreachTarget = {
  id: string
  created_at: string
  bedrijfsnaam: string
  niche_id: string | null
  sector: string | null
  plaats: string | null
  website: string | null
  email: string | null
  telefoon: string | null
  website_score: number | null
  agent_notitie: string | null
  outreach_mail: string | null
  status: 'gevonden' | 'mail_verstuurd' | 'gereageerd' | 'demo_gepland' | 'klant' | 'afgewezen'
  mail_verstuurd_op: string | null
  follow_up_op: string | null
  niches?: Niche
}

export type MarketingContent = {
  id: string
  created_at: string
  niche_id: string
  type: 'cold_email_sequence' | 'linkedin_posts' | 'instagram_posts' | 'landing_page_copy' | 'whatsapp_script'
  titel: string | null
  content: unknown
  status: 'draft' | 'actief' | 'gearchiveerd'
  niches?: Niche
}

// ============================================================
// LEGACY TYPES (backward compat met oude agent-bestanden)
// ============================================================
export type AgentLearning = {
  id: string
  created_at: string
  learning_type: string
  insight: string
  data_points: Record<string, unknown>
}

export type FormField = {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea'
  placeholder?: string
  options?: string[]
  required: boolean
}

export type PdfIdea = { id: string; [key: string]: unknown }
export type Pdf = { id: string; [key: string]: unknown }
export type LandingPage = { id: string; [key: string]: unknown }
export type SocialPost = { id: string; [key: string]: unknown }
export type PdfOrder = { id: string; [key: string]: unknown }
