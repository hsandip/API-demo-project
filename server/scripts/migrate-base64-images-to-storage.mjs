// One-off cleanup: several `users` rows predate the switch to Supabase
// Storage for uploads (see images.service.ts) and still hold a raw base64
// `data:` URI directly in the `image` column or `document.url`, instead of a
// short Storage public URL. Those blobs (100KB-3MB+ each) get returned in
// full on every GET /users list call — that's the actual cause of the slow
// dashboard/search/pagination requests in production, not a cold start or a
// refetch loop. This script uploads each one to the `uploads` Storage bucket
// and replaces the column value with the resulting public URL. Safe to
// re-run — rows that already hold a non-`data:` value are left untouched.
//
//   node scripts/migrate-base64-images-to-storage.mjs
import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env first.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const BUCKET = 'uploads'

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:')
}

function decodeDataUrl(dataUrl) {
  const mimeType = dataUrl.slice(5, dataUrl.indexOf(';'))
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return { buffer: Buffer.from(base64, 'base64'), mimeType }
}

function extensionFor(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  }
  return map[mimeType] ?? 'bin'
}

async function uploadDataUrl(dataUrl, label) {
  const { buffer, mimeType } = decodeDataUrl(dataUrl)
  const path = `${randomUUID()}-migrated-${label}.${extensionFor(mimeType)}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false })
  if (uploadError) throw new Error(`Storage upload failed for ${label}: ${uploadError.message}`)

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { publicUrl, bytes: buffer.length }
}

const { data: users, error } = await supabase.from('users').select('id, image, document')
if (error) throw new Error(`Failed to load users: ${error.message}`)

let fixed = 0
let bytesSaved = 0

for (const user of users ?? []) {
  const update = {}

  if (isDataUrl(user.image)) {
    const before = user.image.length
    const { publicUrl, bytes } = await uploadDataUrl(user.image, `${user.id}-image`)
    update.image = publicUrl
    bytesSaved += before - publicUrl.length
    console.log(`user ${user.id}: image ${bytes} bytes -> ${publicUrl}`)
  }

  if (user.document && isDataUrl(user.document.url)) {
    const before = user.document.url.length
    const { publicUrl, bytes } = await uploadDataUrl(user.document.url, `${user.id}-document`)
    update.document = { ...user.document, url: publicUrl }
    bytesSaved += before - publicUrl.length
    console.log(`user ${user.id}: document ${bytes} bytes -> ${publicUrl}`)
  }

  if (Object.keys(update).length > 0) {
    const { error: updateError } = await supabase.from('users').update(update).eq('id', user.id)
    if (updateError) throw new Error(`Failed to update user ${user.id}: ${updateError.message}`)
    fixed += 1
  }
}

console.log(`\nDone. Fixed ${fixed} user row(s). Payload shrank by ~${(bytesSaved / 1024 / 1024).toFixed(2)}MB across those rows.`)
