import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const [{ data: pdfs }, { data: orders }, { data: leads }] = await Promise.all([
    supabaseAdmin.from('pdfs').select('id, title, price, active, created_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('pdf_orders').select('id, pdf_id, status, created_at'),
    supabaseAdmin.from('leads').select('id, created_at, pdf_id').limit(1000),
  ])

  const pdfStats = (pdfs || []).map((pdf) => {
    const pdfOrders = (orders || []).filter(o => o.pdf_id === pdf.id)
    const sold = pdfOrders.filter(o => o.status === 'delivered').length
    const pdfLeads = (leads || []).filter(l => l.pdf_id === pdf.id).length
    const daysLive = Math.max(1, Math.floor((Date.now() - new Date(pdf.created_at).getTime()) / 86400000))
    return {
      ...pdf,
      sold,
      revenue: sold * pdf.price,
      leads: pdfLeads,
      conversion: pdfLeads > 0 ? ((sold / pdfLeads) * 100).toFixed(1) : '0',
      daysLive,
    }
  })

  const totalRevenue = pdfStats.reduce((sum, p) => sum + p.revenue, 0)

  return NextResponse.json({ pdfStats, totalRevenue })
}
