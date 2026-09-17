import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GENDER_FILTER_OPTIONS, PAGE_SIZE_OPTIONS } from '../constants/users'
import type { GenderFilter } from '../types/user'

interface UsersToolbarProps {
  searchInput: string
  onSearchInputChange: (value: string) => void
  gender: GenderFilter
  onGenderChange: (value: GenderFilter) => void
  perPage: number
  onPerPageChange: (value: number) => void
}

export function UsersToolbar({
  searchInput,
  onSearchInputChange,
  gender,
  onGenderChange,
  perPage,
  onPerPageChange,
}: UsersToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Input
        type="search"
        placeholder="Search by name, email, or username…"
        value={searchInput}
        onChange={(event) => onSearchInputChange(event.target.value)}
        className="max-w-full flex-1 sm:max-w-72"
        aria-label="Search users"
      />

      <Select value={gender} onValueChange={(value) => onGenderChange(value as GenderFilter)}>
        <SelectTrigger className="w-40" aria-label="Filter by gender">
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
        <SelectTrigger className="w-32" aria-label="Rows per page">
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
    </div>
  )
}
