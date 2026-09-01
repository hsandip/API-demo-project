import { describe, expect, it } from 'vitest'
import { formatFileSize, truncateFileName, validateFile } from './fileValidation'

function makeFile(name: string, type: string, sizeBytes: number): File {
  const file = new File([new Uint8Array(sizeBytes)], name, { type })
  return file
}

describe('formatFileSize', () => {
  it('formats bytes under 1KB', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats sizes under 1MB in KB', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('formats sizes at or over 1MB in MB', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB')
  })
})

describe('validateFile', () => {
  const rules = { acceptedTypes: ['image/jpeg', 'image/png'], maxSizeBytes: 5 * 1024 * 1024 }

  it('accepts a file matching type and size rules', () => {
    const file = makeFile('photo.png', 'image/png', 1024)
    expect(validateFile(file, rules)).toBeNull()
  })

  it('rejects an unsupported file type', () => {
    const file = makeFile('doc.pdf', 'application/pdf', 1024)
    const error = validateFile(file, rules)
    expect(error).toContain('Unsupported file type')
  })

  it('rejects a file over the max size', () => {
    const file = makeFile('big.png', 'image/png', 6 * 1024 * 1024)
    const error = validateFile(file, rules)
    expect(error).toContain('too large')
  })

  it('accepts a file exactly at the max size boundary', () => {
    const file = makeFile('exact.png', 'image/png', 5 * 1024 * 1024)
    expect(validateFile(file, rules)).toBeNull()
  })
})

describe('truncateFileName', () => {
  it('leaves short names untouched', () => {
    expect(truncateFileName('a.pdf')).toBe('a.pdf')
  })

  it('truncates long names to the visible character count', () => {
    expect(truncateFileName('certificate-c6k6hym9xud7-1786000654.pdf')).toBe('certi...')
  })

  it('respects a custom visible character count', () => {
    expect(truncateFileName('document.pdf', 3)).toBe('doc...')
  })
})
