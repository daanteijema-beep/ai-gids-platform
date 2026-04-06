import { NextResponse } from 'next/server'
import { clearDashboardSessionCookie } from '@/lib/dashboard-auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  return clearDashboardSessionCookie(response)
}
