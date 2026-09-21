import { createClient, type WebSocketLikeConstructor } from '@supabase/supabase-js'
import WebSocket from 'ws'
import { env } from '../config/env.js'

// Server-only client authenticated with the service_role key, so it bypasses
// Row Level Security — every request from the Express API is trusted the
// same way the old file-backed store was. The frontend never talks to
// Supabase directly; it only ever calls this Express API.
//
// This app never uses Supabase Realtime (no `.channel()`/`.subscribe()`
// calls — every query here is a one-off REST call via `.from()`), but the
// client's constructor unconditionally builds a RealtimeClient, which on
// Node < 22 throws ("native WebSocket not found") unless a WebSocket
// implementation is supplied. Passing the `ws` package satisfies that
// constructor so the app can run on Node 18-21 (per package.json's
// `engines`) without ever actually opening a socket.
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket as unknown as WebSocketLikeConstructor },
})
