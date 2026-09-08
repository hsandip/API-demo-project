import { localApiClient, toApiError } from '../lib/axios'
import { API_ENDPOINTS } from '../constants/api'
import type { UploadResult } from '../types/upload'

interface StoredImage {
  id: string
  originalName: string
  dataUrl: string
  mimeType: string
  size: number
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export const uploadApi = {
  async uploadImage(file: File, onProgress?: (percent: number) => void): Promise<UploadResult> {
    try {
      const dataUrl = await readFileAsDataUrl(file)

      const { data } = await localApiClient.post<StoredImage>(
        API_ENDPOINTS.images.upload,
        { originalName: file.name, dataUrl, mimeType: file.type, size: file.size },
        {
          onUploadProgress: (event) => {
            if (!onProgress || !event.total) return
            onProgress(Math.round((event.loaded / event.total) * 100))
          },
        },
      )

      return {
        id: data.id,
        originalName: data.originalName,
        location: data.dataUrl,
        mimeType: data.mimeType,
        size: data.size,
      }
    } catch (error) {
      throw toApiError(error)
    }
  },

  async deleteImage(id: string): Promise<void> {
    try {
      await localApiClient.delete(API_ENDPOINTS.images.remove(id))
    } catch (error) {
      throw toApiError(error)
    }
  },
}
