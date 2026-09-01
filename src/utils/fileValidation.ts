export interface FileValidationRules {
  acceptedTypes: string[]
  maxSizeBytes: number
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function validateFile(file: File, { acceptedTypes, maxSizeBytes }: FileValidationRules): string | null {
  if (!acceptedTypes.includes(file.type)) {
    return `Unsupported file type. Allowed: ${acceptedTypes.join(', ')}.`
  }
  if (file.size > maxSizeBytes) {
    return `File is too large (${formatFileSize(file.size)}). Max size is ${formatFileSize(maxSizeBytes)}.`
  }
  return null
}

const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
}

export function getFileTypeLabel(mimeType: string): string {
  return FILE_TYPE_LABELS[mimeType] ?? mimeType.split('/').pop()?.toUpperCase() ?? 'FILE'
}

export function truncateFileName(name: string, visibleChars = 5): string {
  return name.length > visibleChars ? `${name.slice(0, visibleChars)}...` : name
}
