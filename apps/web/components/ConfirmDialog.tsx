'use client';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-card border border-border bg-card p-6">
        <h2 className="mb-2 text-lg font-semibold text-white">{title}</h2>
        {description ? <p className="mb-6 whitespace-pre-line text-sm text-muted">{description}</p> : null}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-card border border-border px-4 py-2 text-sm text-white">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-card px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              destructive ? 'bg-danger text-white' : 'bg-gold text-black'
            }`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
