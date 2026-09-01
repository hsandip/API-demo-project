import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { useImageUpload } from '../hooks/useImageUpload'
import { formatFileSize } from '../utils/fileValidation'
import type { ToastData } from './Toast'
import { Button } from '@/components/ui/button'

interface ProfileImageFieldProps {
  value: string | null | undefined
  onChange: (url: string | null) => void
  onNotify: (toast: ToastData) => void
  disabled?: boolean
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png']
const ACCEPT_ATTR = 'image/jpeg,image/png'
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export function ProfileImageField({ value, onChange, onNotify, disabled = false }: ProfileImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const { file, previewUrl, status, progress, result, isBusy, selectFile, upload, clear } =
    useImageUpload({
      acceptedTypes: ACCEPTED_TYPES,
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      onNotify,
      entityLabel: 'Image',
    })

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Selecting a file uploads it right away; once the shared hook reports
  // success, push the stored image's URL up to the form so it's included
  // when the user record is created/saved. Keyed on primitives so this
  // doesn't re-fire just because the parent re-rendered with a new
  // onChange reference.
  useEffect(() => {
    if (status === 'success' && result) {
      onChangeRef.current(result.location)
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

  const displayedImage =
    status === 'success' || status === 'deleting' ? result?.location : file ? previewUrl : value
  const hasImage = Boolean(displayedImage)

  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">Profile image</span>
      <div className="flex items-center gap-3">
        <div
          className={[
            'relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
            !disabledState && 'hover:border-primary/50 hover:shadow-md',
            isDragActive && 'border-primary bg-accent',
            disabledState && 'cursor-not-allowed opacity-60',
            hasImage && 'border-solid bg-card',
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
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={handleInputChange}
            // Deliberately not `disabled`: the browser returns focus to
            // this input right after the native file picker closes, and
            // disabling the currently-focused element forces the browser
            // to blur it to <body> (per the HTML spec) — which Radix's
            // Dialog reads as focus having left the modal and dismisses
            // it. openFileDialog() already guards against re-opening the
            // picker while busy, so nothing is lost by not disabling it.
            aria-disabled={disabledState}
            className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
            aria-label="Profile image upload"
            tabIndex={-1}
          />
          {hasImage ? (
            <img
              src={displayedImage ?? ''}
              alt="Profile"
              className="block h-full w-full object-cover"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <span
                className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-base text-primary"
                aria-hidden="true"
              >
                ⇪
              </span>
              <p className="m-0 text-[11px]">Add photo</p>
            </div>
          )}
        </div>

        {hasImage && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              // Same reasoning as the main input's aria-disabled above:
              // this button can hold real focus on click (Windows/Linux
              // browsers), so it must not become natively `disabled` while
              // that's possible — guard here instead.
              if (disabledState) return
              replaceInputRef.current?.click()
            }}
            aria-disabled={disabledState}
            tabIndex={disabledState ? -1 : undefined}
            aria-label="Replace profile image"
            title="Replace profile image"
          >
            ✎
          </Button>
        )}

        <input
          ref={replaceInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={handleReplaceChange}
          className="hidden"
          aria-label="Replace profile image input"
        />
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        JPG or PNG up to {formatFileSize(MAX_FILE_SIZE_BYTES)}.
        {status === 'uploading' ? ` Uploading… ${progress}%` : ''}
      </p>
    </div>
  )
}
