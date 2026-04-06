import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client-side (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side (service role — bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type PdfIdea = {
  id: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected' | 'published'
  niche: string
  title: string
  subtitle: string
  target_audience: string
  problem_solved: string
  estimated_price: number
  research_rationale: string
  agent_confidence_score: number
  form_fields: FormField[]
}

export type FormField = {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea'
  placeholder?: string
  options?: string[]
  required: boolean
}

export type Pdf = {
  id: string
  idea_id: string
  created_at: string
  title: string
  subtitle: string
  description: string
  price: number
  stripe_product_id: string
  stripe_price_id: string
  slug: string
  form_fields: FormField[]
  active: boolean
}

export type LandingPage = {
  id: string
  pdf_id: string
  hero_headline: string
  hero_subtext: string
  pain_points: string[]
  benefits: string[]
  social_proof: string[]
  faq: { question: string; answer: string }[]
  generated_at: string
}

export type SocialPost = {
  id: string
  pdf_id: string
  created_at: string
  platform: 'instagram' | 'linkedin' | 'tiktok'
  post_type: 'awareness' | 'interest' | 'conversion'
  content_text: string
  hashtags: string[]
  visual_description: string
  scheduled_date: string
  status: 'planned' | 'published'
}

export type PdfOrder = {
  id: string
  pdf_id: string
  created_at: string
  stripe_session_id: string
  customer_email: string
  customer_name: string
  customer_inputs: Record<string, string>
  generated_pdf_content: string | null
  email_sent: boolean
  status: 'pending_payment' | 'paid' | 'generated' | 'delivered'
}

export type AgentLearning = {
  id: string
  created_at: string
  learning_type: 'niche_performance' | 'price_sensitivity' | 'platform_roi' | 'general'
  insight: string
  data_points: Record<string, unknown>
}
