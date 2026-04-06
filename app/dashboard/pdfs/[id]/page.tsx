import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import PdfDashboardClient from './PdfDashboardClient'

export const revalidate = 30

type Props = { params: Promise<{ id: string }> }

async function getData(id: string) {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience, research_rationale)')
    .eq('id', id)
    .single()

  if (!pdf) return null

  const [landing, template, posts, leads, orders, emailLearning] = await Promise.all([
    supabaseAdmin.from('landing_pages').select('*').eq('pdf_id', id).maybeSingle(),
    supabaseAdmin.from('pdf_templates').select('*').eq('pdf_id', id).maybeSingle(),
    supabaseAdmin.from('social_posts').select('*').eq('pdf_id', id).order('scheduled_date'),
    supabaseAdmin.from('leads').select('id, email, name, created_at, source').eq('pdf_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('pdf_orders').select('id, customer_name, customer_email, status, created_at').eq('pdf_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('agent_learnings')
      .select('data_points, created_at')
      .eq('learning_type', 'outreach_strategy')
      .filter('data_points->>pdf_id', 'eq', id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  return {
    pdf,
    landing: landing.data,
    template: template.data,
    posts: posts.data || [],
    leads: leads.data || [],
    orders: orders.data || [],
    emailSequences: emailLearning.data?.[0]?.data_points?.sequences || [],
  }
}

export default async function PdfDashboardPage({ params }: Props) {
  const { id } = await params
  const data = await getData(id)
  if (!data) notFound()
  return <PdfDashboardClient data={data} />
}
