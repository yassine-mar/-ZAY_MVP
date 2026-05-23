import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** When true, the user must provide a reason (min 10 chars) to confirm. */
  requireReason?: boolean;
  reasonLabel?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: (reason?: string) => void | Promise<void>;
}

/**
 * Inline modal — kept lightweight because the full Radix Dialog is not
 * shipped in this scaffold. For Phase 2 swap to `@radix-ui/react-dialog`
 * via shadcn-ui CLI for proper accessibility.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  requireReason = false,
  reasonLabel = 'Reason',
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const disabled = submitting || (requireReason && reason.trim().length < 10);

  const close = () => {
    setReason('');
    onOpenChange(false);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      close();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-start gap-3">
          {destructive && (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          )}
          <div className="flex-1">
            <h2 className="text-base font-semibold">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 text-muted-foreground hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {requireReason && (
          <div className="mt-4 space-y-2">
            <Label htmlFor="reason">{reasonLabel}</Label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="At least 10 characters"
              minLength={10}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reason.trim().length}/500 characters
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={disabled}
            onClick={submit}
          >
            {submitting ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
