// One-off migration: copies the existing file-backed data/db.json (users +
// images) into Supabase. Run once, after creating the tables with
// server/supabase/schema.sql and setting SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY in server/.env — safe to re-run (upserts by id).
//
//   node scripts/migrate-json-to-supabase.mjs
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env first.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const dbPath = path.resolve(process.cwd(), 'data/db.json')
const raw = await readFile(dbPath, 'utf-8').catch(() => null)

if (raw === null) {
  console.log(`No ${dbPath} found — nothing to migrate.`)
  process.exit(0)
}

const { users = [], images = [] } = JSON.parse(raw)

if (users.length > 0) {
  const { error } = await supabase.from('users').upsert(users, { onConflict: 'id' })
  if (error) throw new Error(`Migrating users failed: ${error.message}`)
  console.log(`Migrated ${users.length} user(s).`)
}

if (images.length > 0) {
  const { error } = await supabase.from('images').upsert(images, { onConflict: 'id' })
  if (error) throw new Error(`Migrating images failed: ${error.message}`)
  console.log(`Migrated ${images.length} image(s).`)
}

console.log('Done. Once you\'ve confirmed the data in Supabase, delete server/data/db.json — it is no longer read by the server.')
