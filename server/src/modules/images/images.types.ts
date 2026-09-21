// Mirrors the shape previously stored in db.json's `images` collection by
// json-server, and the `StoredImage` shape vite-project's
// src/services/upload.service.ts already expects back.
export interface StoredImage {
  id: string
  originalName: string
  dataUrl: string
  mimeType: string
  size: number
}

export type StoredImageInput = Omit<StoredImage, 'id'>
