import { supabase } from '../../lib/supabaseClient.js'
import { ApiError } from '../../lib/ApiError.js'
import type { StoredImage, StoredImageInput } from './images.types.js'

const TABLE = 'images'

export const imagesService = {
  async upload(input: StoredImageInput): Promise<StoredImage> {
    // `id` is left for the table's default (gen_random_uuid()) rather than
    // generated here — see server/README or the Supabase setup SQL.
    const { data, error } = await supabase.from(TABLE).insert(input).select().single()
    if (error) throw new ApiError(502, `Supabase error: ${error.message}`)
    return data as StoredImage
  },

  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select().maybeSingle()
    if (error) throw new ApiError(502, `Supabase error: ${error.message}`)
    if (!data) throw ApiError.notFound(`Image ${id} not found`)
  },
}
