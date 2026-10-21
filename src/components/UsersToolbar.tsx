import { Grid3X3, List, ChevronDown, Palette } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { GENDER_FILTER_OPTIONS, PAGE_SIZE_OPTIONS } from '../constants/users'
import type { GenderFilter } from '../types/user'
import { useTheme, type ThemeName } from '../context/ThemeContext'

type ViewMode = 'table' | 'grid'
type ColumnKey = 'photo' | 'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'document' | 'actions'

const THEME_OPTIONS: { value: ThemeName; label: string; color: string }[] = [
  { value: 'purple', label: 'Purple', color: '#aa3bff' },
  { value: 'blue', label: 'Blue', color: '#2563eb' },
  { value: 'green', label: 'Green', color: '#16a34a' },
  { value: 'orange', label: 'Orange', color: '#ea580c' },
]

const COLUMN_LABELS: Record<ColumnKey, string> = {
  photo: 'Photo',
  id: 'ID',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  document: 'Document',
  actions: 'Actions',
}

const COLUMNS_ORDER: ColumnKey[] = ['photo', 'id', 'firstName', 'lastName', 'email', 'phone', 'document', 'actions']

interface UsersToolbarProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  gender: GenderFilter
  onGenderChange: (value: GenderFilter) => void
  perPage: number
  onPerPageChange: (value: number) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  hiddenColumns: Set<ColumnKey>
  onToggleColumnVisibility: (column: ColumnKey) => void
}

export function UsersToolbar({
  searchInput,
  onSearchInputChange,
  gender,
  onGenderChange,
  perPage,
  onPerPageChange,
  viewMode,
  onViewModeChange,
  hiddenColumns,
  onToggleColumnVisibility,
}: UsersToolbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Input
        type="search"
        placeholder="Search by name, email, or username…"
        value={searchInput}
        onChange={(event) => onSearchInputChange(event.target.value)}
        className="h-10 max-w-full flex-1 sm:max-w-72"
        aria-label="Search users"
      />

      {viewMode === 'table' && (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="h-10 whitespace-nowrap flex items-center gap-1"
            title="Toggle column visibility"
          >
            Hide Columns
            <ChevronDown className="size-4" aria-hidden="true" />
          </Button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-10 bg-card border border-border rounded-lg shadow-lg p-2 min-w-48">
              <div className="space-y-1.5">
                {COLUMNS_ORDER.map((column) => {
                  const isHidden = hiddenColumns.has(column)
                  const visibleCount = 8 - hiddenColumns.size
                  const canHide = visibleCount > 1 || !isHidden

                  return (
                    <label
                      key={column}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        onChange={() => onToggleColumnVisibility(column)}
                        disabled={!canHide}
                        className="h-4 w-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Toggle ${COLUMN_LABELS[column]} column`}
                      />
                      <span className={isHidden ? 'text-muted-foreground' : ''}>{COLUMN_LABELS[column]}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <Select value={gender} onValueChange={(value) => onGenderChange(value as GenderFilter)}>
        <SelectTrigger className="h-10 w-40" aria-label="Filter by gender">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GENDER_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(perPage)} onValueChange={(value) => onPerPageChange(Number(value))}>
        <SelectTrigger className="h-10 w-32" aria-label="Rows per page">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size} / page
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 h-10">
        <Button
          type="button"
          variant={viewMode === 'table' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('table')}
          title="Table View"
          className="h-8 w-8 p-0"
          aria-label="Switch to table view"
        >
          <List className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          title="Grid View"
          className="h-8 w-8 p-0"
          aria-label="Switch to grid view"
        >
          <Grid3X3 className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
          className="h-10 whitespace-nowrap flex items-center gap-1"
          title="Change theme"
          aria-label="Change color theme"
        >
          <Palette className="size-4" aria-hidden="true" />
          Theme
          <ChevronDown className="size-4" aria-hidden="true" />
        </Button>

        {isThemeDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 z-10 bg-card border border-border rounded-lg shadow-lg p-2 min-w-40">
            <div className="space-y-1.5">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value)
                    setIsThemeDropdownOpen(false)
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
                    theme === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div
                    className="h-3 w-3 rounded-full border border-current"
                    style={{ backgroundColor: option.color }}
                    aria-hidden="true"
                  />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
