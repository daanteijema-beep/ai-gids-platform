import type { NextRequest } from 'next/server'
import { hasDashboardSessionFromRequest } from '@/lib/dashboard-auth'

function getBearerToken(req: NextRequest): string {
  const auth = req.headers.get('authorization') || ''
  return auth.replace(/^Bearer\s+/i, '')
}

export function isCronAuthorizedRequest(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return false
  }

  const secretFromHeader = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret') || ''
  const bearerToken = getBearerToken(req)

  return secretFromHeader === cronSecret || bearerToken === cronSecret
}

export function isDashboardOrCronAuthorizedRequest(req: NextRequest): boolean {
  return hasDashboardSessionFromRequest(req) || isCronAuthorizedRequest(req)
}
