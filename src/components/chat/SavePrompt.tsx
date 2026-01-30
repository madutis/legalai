'use client';

import { Button } from '@/components/ui/button';

interface SavePromptProps {
  isOpen: boolean;
  onSave: () => void;
  onDontSave: () => void;
  onCancel: () => void;
}

/**
 * Modal prompt shown when leaving a chat that has savePreference='pending'.
 * Asks user whether to save the current consultation.
 */
export function SavePrompt({ isOpen, onSave, onDontSave, onCancel }: SavePromptProps) {
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
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gold"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Išsaugoti konsultaciją?
          </h2>
          <p className="text-muted-foreground mb-6">
            Ar norite išsaugoti šią konsultaciją?
          </p>

          <div className="space-y-3">
            <Button
              onClick={onSave}
              className="w-full"
            >
              Išsaugoti
            </Button>
            <Button
              onClick={onDontSave}
              variant="destructive"
              className="w-full"
            >
              Neišsaugoti
            </Button>
            <Button
              onClick={onCancel}
              variant="ghost"
              className="w-full"
            >
              Atšaukti
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
