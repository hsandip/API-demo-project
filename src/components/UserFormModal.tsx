import { useState } from 'react'
import type { UserInput } from '../types/user'
import { ProfileImageField } from './ProfileImageField'
import { DocumentFileUploadSection } from './DocumentFileUploadSection'
import type { ToastData } from './Toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface UserFormModalProps {
  mode: 'create' | 'edit'
  initialValues: UserInput
  isSubmitting: boolean
  onSubmit: (values: UserInput) => void
  onCancel: () => void
  onNotify: (toast: ToastData) => void
}

type FormErrors = Partial<Record<keyof UserInput, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GENDER_UNSET = 'unspecified'

export function UserFormModal({
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
  onNotify,
}: UserFormModalProps) {
  const [values, setValues] = useState<UserInput>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})

  function updateField<K extends keyof UserInput>(key: K, value: UserInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): FormErrors {
    const nextErrors: FormErrors = {}

    if (!values.firstName.trim()) nextErrors.firstName = 'First name is required.'
    if (!values.lastName.trim()) nextErrors.lastName = 'Last name is required.'
    if (!values.username.trim()) nextErrors.username = 'Username is required.'
    if (!values.email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!EMAIL_PATTERN.test(values.email)) {
      nextErrors.email = 'Enter a valid email address.'
    }
    if (!values.phone.trim()) nextErrors.phone = 'Phone is required.'
    if (values.age != null && (Number.isNaN(values.age) || values.age <= 0)) {
      nextErrors.age = 'Age must be a positive number.'
    }

    return nextErrors
  }

  function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit(values)
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !isSubmitting && onCancel()}
    >
      <DialogContent
        showCloseButton={false}
        aria-label="User form"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => isSubmitting && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add User' : 'Edit User'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ProfileImageField
            value={values.image}
            onChange={(url) => updateField('image', url)}
            onNotify={onNotify}
            disabled={isSubmitting}
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Label className="mb-4 flex flex-1 flex-col items-stretch gap-1.5">
              <span className="text-sm font-medium text-foreground">First name</span>
              <Input
                value={values.firstName}
                onChange={(event) => updateField('firstName', event.target.value)}
              />
              {errors.firstName && <p className="m-0 text-[13px] text-destructive">{errors.firstName}</p>}
            </Label>

            <Label className="mb-4 flex flex-1 flex-col items-stretch gap-1.5">
              <span className="text-sm font-medium text-foreground">Last name</span>
              <Input
                value={values.lastName}
                onChange={(event) => updateField('lastName', event.target.value)}
              />
              {errors.lastName && <p className="m-0 text-[13px] text-destructive">{errors.lastName}</p>}
            </Label>
          </div>

          <Label className="mb-4 flex flex-1 flex-col items-stretch gap-1.5">
            <span className="text-sm font-medium text-foreground">Username</span>
            <Input
              value={values.username}
              onChange={(event) => updateField('username', event.target.value)}
            />
            {errors.username && <p className="m-0 text-[13px] text-destructive">{errors.username}</p>}
          </Label>

          <Label className="mb-4 flex flex-1 flex-col items-stretch gap-1.5">
            <span className="text-sm font-medium text-foreground">Email</span>
            <Input
              type="email"
              value={values.email}
              onChange={(event) => updateField('email', event.target.value)}
            />
            {errors.email && <p className="m-0 text-[13px] text-destructive">{errors.email}</p>}
          </Label>

          <Label className="mb-4 flex flex-1 flex-col items-stretch gap-1.5">
            <span className="text-sm font-medium text-foreground">Phone</span>
            <Input
              value={values.phone}
              onChange={(event) => updateField('phone', event.target.value)}
            />
            {errors.phone && <p className="m-0 text-[13px] text-destructive">{errors.phone}</p>}
          </Label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Label className="mb-4 flex flex-1 flex-col items-stretch gap-1.5">
              <span className="text-sm font-medium text-foreground">Age</span>
              <Input
                type="number"
                step="1"
                value={values.age ?? ''}
                onChange={(event) =>
                  updateField(
                    'age',
                    event.target.value === '' ? undefined : Number(event.target.value),
                  )
                }
              />
              {errors.age && <p className="m-0 text-[13px] text-destructive">{errors.age}</p>}
            </Label>

            <Label className="mb-4 flex flex-1 flex-col items-stretch gap-1.5">
              <span className="text-sm font-medium text-foreground">Gender</span>
              <Select
                value={values.gender ?? GENDER_UNSET}
                onValueChange={(value) =>
                  updateField('gender', value === GENDER_UNSET ? undefined : value)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENDER_UNSET}>—</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Label>
          </div>

          <DocumentFileUploadSection
            value={values.document}
            onChange={(document) => updateField('document', document)}
            onNotify={onNotify}
            disabled={isSubmitting}
          />

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create' : 'Save all fields'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
