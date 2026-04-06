type RequiredEnvName =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'SUPABASE_SERVICE_ROLE_KEY'

export function getRequiredEnv(name: RequiredEnvName): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      'Add it to .env.local or your Vercel project settings.'
    )
  }

  return value
}

export function getSupabaseUrl(): string {
  return getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')
}

export function getSupabaseClientKey(): string {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (publishableKey) {
    return publishableKey
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (anonKey) {
    return anonKey
  }

  throw new Error(
    'Missing Supabase client key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
    'or the legacy NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

export function getSupabaseServiceRoleKey(): string {
  return getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
}

export function getSupabaseFunctionsBaseUrl(): string {
  return `${getSupabaseUrl()}/functions/v1`
}

export function getSupabaseFunctionUrl(functionName: string): string {
  return `${getSupabaseFunctionsBaseUrl()}/${functionName}`
}
