import { useEffect, useRef, useState } from 'react'
import { uploadApi } from '../services/upload.service'
import { ApiError } from '../lib/axios'
import { validateFile } from '../utils/fileValidation'
import type { ToastData } from '../components/Toast'
import type { UploadResult } from '../types/upload'

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'deleting'

export interface UseImageUploadOptions {
  acceptedTypes: string[]
  maxSizeBytes: number
  onNotify: (toast: ToastData) => void
  entityLabel?: string
}

/**
 * Shared state machine behind every "select an image, upload it, preview it,
 * delete it" section in this app. Centralizing this avoids the object-URL
 * leaks and copy/paste drift that came from three near-identical
 * implementations (validation, toast wording, and the idle/uploading/
 * success/error/deleting transitions were duplicated verbatim before).
 */
export function useImageUpload({
  acceptedTypes,
  maxSizeBytes,
  onNotify,
  entityLabel = 'Image',
}: UseImageUploadOptions) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [validationError, setValidationError] = useState('')

  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState<ApiError | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)

  const previewUrlRef = useRef('')
  previewUrlRef.current = previewUrl

  // Revoke whatever object URL is outstanding when the component using this
  // hook unmounts — re-select/clear already revoke the previous one, but
  // nothing previously ran on unmount.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  function resetOutcome() {
    setStatus('idle')
    setProgress(0)
    setUploadError(null)
    setResult(null)
  }

  function selectFile(selected: File) {
    const error = validateFile(selected, { acceptedTypes, maxSizeBytes })
    if (error) {
      setValidationError(error)
      onNotify({ type: 'error', message: error })
      return
    }

    setValidationError('')
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(selected)
    })
    resetOutcome()
    setFile(selected)
  }

  async function upload() {
    if (!file) {
      const message = 'Please select a file to upload.'
      setValidationError(message)
      onNotify({ type: 'error', message })
      return
    }
    setStatus('uploading')
    setProgress(0)
    setUploadError(null)

    try {
      const uploaded = await uploadApi.uploadImage(file, setProgress)
      setResult(uploaded)
      setStatus('success')
      onNotify({ type: 'success', message: `${entityLabel} uploaded successfully.` })
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('Upload failed.', 0)
      setUploadError(apiError)
      setStatus('error')
      onNotify({ type: 'error', message: `Upload failed (${apiError.status || 'network error'}).` })
    }
  }

  function clearLocalState() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
    setFile(null)
    setValidationError('')
    resetOutcome()
  }

  async function clear() {
    if (!result) {
      clearLocalState()
      return
    }

    setStatus('deleting')

    try {
      await uploadApi.deleteImage(result.id)
      clearLocalState()
      onNotify({ type: 'success', message: `${entityLabel} deleted successfully.` })
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('Delete failed.', 0)
      setStatus('success')
      onNotify({ type: 'error', message: `Delete failed (${apiError.status || 'network error'}).` })
    }
  }

  return {
    file,
    previewUrl,
    validationError,
    status,
    progress,
    uploadError,
    result,
    isBusy: status === 'uploading' || status === 'deleting',
    selectFile,
    upload,
    clear,
  }
}
