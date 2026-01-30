'use client';

import { Button } from '@/components/ui/button';

interface DeleteConsultationDialogProps {
  isOpen: boolean;
  consultationTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for deleting a consultation.
 */
export function DeleteConsultationDialog({
  isOpen,
  consultationTitle,
  onConfirm,
  onCancel,
}: DeleteConsultationDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="relative bg-card border border-border rounded-xl shadow-lg max-w-sm w-full mx-4 p-6 animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Istrinti konsultacija?
          </h2>
          <p className="text-muted-foreground mb-6">
            Ar tikrai norite istrinti &ldquo;{consultationTitle}&rdquo;? Sio veiksmo negalima atsaukti.
          </p>

          <div className="space-y-3">
            <Button
              onClick={onConfirm}
              variant="destructive"
              className="w-full"
            >
              Istrinti
            </Button>
            <Button
              onClick={onCancel}
              variant="ghost"
              className="w-full"
            >
              Atsaukti
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
