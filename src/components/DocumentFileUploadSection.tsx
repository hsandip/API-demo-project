import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { useImageUpload } from '../hooks/useImageUpload'
import { formatFileSize, getFileTypeLabel } from '../utils/fileValidation'
import type { ToastData } from './Toast'
import type { UserDocument } from '../types/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface DocumentFileUploadSectionProps {
  value: UserDocument | null | undefined
  onChange: (document: UserDocument | null) => void
  onNotify: (toast: ToastData) => void
  disabled?: boolean
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const ACCEPT_ATTR = '.pdf,.doc,.docx,.txt'
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export function DocumentFileUploadSection({
  value,
  onChange,
  onNotify,
  disabled = false,
}: DocumentFileUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const { file, status, progress, result, isBusy, selectFile, upload, clear } = useImageUpload({
    acceptedTypes: ACCEPTED_TYPES,
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
    onNotify,
    entityLabel: 'File',
  })

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Selecting a file uploads it right away; once the shared hook reports
  // success, push the stored document's info up to the form so it's
  // included when the user record is created/saved — same pattern as
  // ProfileImageField's image upload.
  useEffect(() => {
    if (status === 'success' && result) {
      onChangeRef.current({
        url: result.location,
        name: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
      })
    }
  }, [status, result?.location])

  useEffect(() => {
    if (file && status === 'idle') {
      upload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const disabledState = disabled || isBusy

  function openFileDialog() {
    if (disabledState) return
    inputRef.current?.click()
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (selected) selectFile(selected)
    event.target.value = ''
  }

  async function handleReplaceChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return
    if (result) await clear()
    onChangeRef.current(null)
    selectFile(selected)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!disabledState) setIsDragActive(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragActive(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragActive(false)
    if (disabledState) return
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) selectFile(dropped)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openFileDialog()
    }
  }

  const displayedDocument =
    status === 'success' || status === 'deleting'
      ? result && { mimeType: result.mimeType, size: result.size }
      : value
        ? { mimeType: value.mimeType, size: value.size }
        : null
  const hasDocument = Boolean(displayedDocument)

  return (
    <section>
      <span className="block text-sm font-medium text-foreground">Document &amp; File Upload</span>
      <p className="mt-1.5 mb-3 text-sm text-muted-foreground">
        PDF, DOC, DOCX, or TXT (max{' '}
        {formatFileSize(MAX_FILE_SIZE_BYTES)})
      </p>

      <div className="flex w-full items-center gap-2">
        <div
          className={[
            'group relative flex h-13 min-w-0 flex-1 items-center justify-start rounded-xl border-2 border-dashed border-border bg-muted px-4 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
            !disabledState && 'hover:border-primary/50',
            isDragActive && 'border-primary bg-accent',
            disabledState && 'cursor-not-allowed opacity-60',
            hasDocument && 'border-solid bg-card',
          ]
            .filter(Boolean)
            .join(' ')}
          role="button"
          tabIndex={disabledState ? -1 : 0}
          aria-disabled={disabledState}
          onClick={openFileDialog}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={handleInputChange}
            aria-disabled={disabledState}
            className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0 opacity-0 shadow-none pointer-events-none"
            aria-label="Document upload"
            tabIndex={-1}
          />

          <span
            className="mr-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-primary"
            aria-hidden="true"
          >
            {hasDocument ? '📄' : '⇪'}
          </span>
          <span className="min-w-0 truncate text-[13px] text-foreground">
            {hasDocument && displayedDocument
              ? `${getFileTypeLabel(displayedDocument.mimeType)} · ${formatFileSize(displayedDocument.size)}`
              : status === 'uploading'
                ? `Uploading… ${progress}%`
                : 'Click or drag and drop a document to upload'}
          </span>
        </div>

        {hasDocument && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (disabledState) return
              replaceInputRef.current?.click()
            }}
            aria-disabled={disabledState}
            tabIndex={disabledState ? -1 : undefined}
            aria-label="Replace document"
            title="Replace document"
          >
            ✎
          </Button>
        )}

        <Input
          ref={replaceInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={handleReplaceChange}
          className="hidden"
          aria-label="Replace document input"
        />
      </div>

      {status === 'uploading' && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <div className="h-2 max-w-80 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-150 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>{progress}%</span>
        </div>
      )}
    </section>
  )
}
