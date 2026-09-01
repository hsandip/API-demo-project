// Rendering now goes through shadcn/ui's sonner-backed <Toaster /> (mounted
// once in App.tsx) instead of this file's own component — see
// `notifyToast()` in DashboardPage.tsx, which every upload/CRUD flow still
// calls via the same `onNotify(toast: ToastData)` shape as before.
export interface ToastData {
  type: 'success' | 'error'
  message: string
}
