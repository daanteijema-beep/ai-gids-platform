import { NextRequest, NextResponse } from 'next/server'
import { attachDashboardSessionCookie, isDashboardPasswordValid } from '@/lib/dashboard-auth'

function getSafeNextPath(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/dashboard') ? value : '/dashboard'
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const password = typeof body.password === 'string' ? body.password : ''
  const nextPath = getSafeNextPath(body.next)

  if (!isDashboardPasswordValid(password)) {
    return NextResponse.json({ error: 'Verkeerd wachtwoord.' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true, next: nextPath })
  return attachDashboardSessionCookie(response)
}
