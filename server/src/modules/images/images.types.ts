// Mirrors the shape previously stored in db.json's `images` collection by
// json-server, and the `StoredImage` shape vite-project's
// src/services/upload.service.ts already expects back.
//
// `dataUrl` is a historical name: it holds a Supabase Storage public URL
// (see images.service.ts), not a base64 data URL, for anything uploaded
// after that change. Kept as-is rather than renamed so the API response
// shape — and every existing frontend consumer of it — stays unchanged.
export interface StoredImage {
  id: string
  originalName: string
  dataUrl: string
  mimeType: string
  size: number
}

export type StoredImageInput = Omit<StoredImage, 'id'>
