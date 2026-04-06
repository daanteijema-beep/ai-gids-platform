import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest, NextResponse } from 'next/server'

const DASHBOARD_COOKIE_NAME = 'vakwebtwente_dashboard_session'
const DASHBOARD_SESSION_NAMESPACE = 'vakwebtwente-dashboard-session'

function getDashboardPassword(): string {
  return process.env.DASHBOARD_PASSWORD || process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD || ''
}

function getDashboardSessionSecret(): string {
  return process.env.DASHBOARD_SESSION_SECRET || process.env.CRON_SECRET || getDashboardPassword()
}

function createDashboardSessionValue(): string {
  const secret = getDashboardSessionSecret()

  if (!secret) {
    return ''
  }

  return createHmac('sha256', secret)
    .update(DASHBOARD_SESSION_NAMESPACE)
    .digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  if (aBuffer.length !== bBuffer.length) {
    return false
  }

  return timingSafeEqual(aBuffer, bBuffer)
}

export function isDashboardPasswordValid(password: string): boolean {
  const expectedPassword = getDashboardPassword()

  if (!expectedPassword) {
    return false
  }

  return safeEqual(password, expectedPassword)
}

export function isDashboardSessionValueValid(value?: string): boolean {
  const expectedValue = createDashboardSessionValue()

  if (!value || !expectedValue) {
    return false
  }

  return safeEqual(value, expectedValue)
}

export async function hasDashboardSession(): Promise<boolean> {
  const cookieStore = await cookies()
  return isDashboardSessionValueValid(cookieStore.get(DASHBOARD_COOKIE_NAME)?.value)
}

export function hasDashboardSessionFromRequest(req: NextRequest): boolean {
  return isDashboardSessionValueValid(req.cookies.get(DASHBOARD_COOKIE_NAME)?.value)
}

export function attachDashboardSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: DASHBOARD_COOKIE_NAME,
    value: createDashboardSessionValue(),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  })

  return response
}

export function clearDashboardSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: DASHBOARD_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}
