import 'dotenv/config'
import { ConfigError } from '../lib/ConfigError.js'

export { ConfigError }

// Collects every missing required variable (rather than failing on the
// first) so a misconfigured server/.env can be fixed in one pass instead of
// one restart per variable.
const missing: string[] = []

function requireEnv(name: string, fallback?: string): string {
  // An empty string (e.g. `SUPABASE_URL=` left blank in .env) is treated the
  // same as unset — `??` alone wouldn't catch it, and the resulting error
  // from whatever consumes the empty value downstream is far less clear
  // than failing here with the variable's name.
  const raw = process.env[name]
  const value = raw && raw.length > 0 ? raw : fallback
  if (value === undefined) {
    missing.push(name)
    return ''
  }
  return value
}

const nodeEnv = process.env.NODE_ENV ?? 'development'
const port = Number(requireEnv('PORT', '4000'))
const host = requireEnv('HOST', '0.0.0.0')
// Comma-separated list of allowed origins, e.g. "http://localhost:5173,https://app.example.com"
const corsOrigins = requireEnv('CORS_ORIGIN', 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
// service_role key — bypasses Row Level Security, so this must only ever
// live server-side (never sent to or used by the frontend).
const supabaseUrl = requireEnv('SUPABASE_URL')
const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

if (missing.length > 0) {
  throw new ConfigError(
    `Missing required environment variable(s): ${missing.join(', ')}.\n` +
      'Set them in server/.env (copy server/.env.example if it does not exist yet).\n' +
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY come from your Supabase project\'s ' +
      'Settings -> API page; see IMPLEMENTATION.md "Setting up Supabase (one-time)".',
  )
}

export const env = {
  nodeEnv,
  port,
  host,
  corsOrigins,
  supabaseUrl,
  supabaseServiceRoleKey,
} as const

export const isProduction = env.nodeEnv === 'production'
