import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex items-start gap-3.5">
        <div
          className={
            variant === 'danger'
              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-100'
              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-100'
          }
        >
          <AlertTriangle className={variant === 'danger' ? 'h-5 w-5 text-danger-600' : 'h-5 w-5 text-warning-600'} />
        </div>
        <div className="min-w-0 pt-1">
          <h3 className="font-display text-sm font-semibold text-ink-900">{title}</h3>
          {description && <p className="mt-1.5 text-sm text-ink-500">{description}</p>}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
