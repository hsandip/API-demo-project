import { randomUUID } from 'node:crypto'
import { supabase } from '../../lib/supabaseClient.js'
import { ApiError } from '../../lib/ApiError.js'
import type { StoredImage, StoredImageInput } from './images.types.js'

const TABLE = 'images'
// Public bucket: every consumer of an uploaded image/document (the profile
// photo <img>, the document link) renders it directly with no auth token,
// same as the base64 data URL it replaces — so a public object, not a
// signed one, matches existing access behavior exactly.
const BUCKET = 'uploads'

function decodeDataUrl(dataUrl: string): Buffer {
  // uploadImageSchema already guarantees a `data:...;base64,<payload>` shape.
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Buffer.from(base64, 'base64')
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

// The public URL Supabase Storage returns is fully determined by the bucket
// and object path (`.../object/public/<bucket>/<path>`), so the path can be
// recovered from it at delete time without storing it in a separate column.
function storagePathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const index = publicUrl.indexOf(marker)
  return index === -1 ? null : publicUrl.slice(index + marker.length)
}

export const imagesService = {
  async upload(input: StoredImageInput): Promise<StoredImage> {
    const path = `${randomUUID()}-${sanitizeFileName(input.originalName)}`
    const buffer = decodeDataUrl(input.dataUrl)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: input.mimeType, upsert: false })
    if (uploadError) throw new ApiError(502, `Supabase storage error: ${uploadError.message}`)

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path)

    // `dataUrl` now holds the Storage public URL, not a base64 payload —
    // kept under its original column/field name so the row shape (and every
    // existing consumer of it, frontend included) stays unchanged.
    //
    // `id` is left for the table's default (gen_random_uuid()) rather than
    // generated here — see server/README or the Supabase setup SQL.
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        originalName: input.originalName,
        dataUrl: publicUrl,
        mimeType: input.mimeType,
        size: input.size,
      })
      .select()
      .single()
    if (error) {
      // Don't leave an orphaned object in Storage if the metadata row failed.
      await supabase.storage.from(BUCKET).remove([path])
      throw new ApiError(502, `Supabase error: ${error.message}`)
    }
    return data as StoredImage
  },

  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select().maybeSingle()
    if (error) throw new ApiError(502, `Supabase error: ${error.message}`)
    if (!data) throw ApiError.notFound(`Image ${id} not found`)

    // Best-effort: also remove the underlying Storage object. A legacy row
    // whose `dataUrl` is still a base64 data URL (uploaded before this
    // change) has no matching Storage path — storagePathFromPublicUrl
    // returns null for those and this is skipped, same as before.
    const path = storagePathFromPublicUrl((data as StoredImage).dataUrl)
    if (path) {
      await supabase.storage.from(BUCKET).remove([path])
    }
  },
}
