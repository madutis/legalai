'use client';

import { Button } from '@/components/ui/button';

interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsageLimitModal({ isOpen, onClose }: UsageLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-card border border-border rounded-xl shadow-lg max-w-sm w-full mx-4 p-6 animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Dienos limitas pasiektas
          </h2>
          <p className="text-muted-foreground mb-6">
            Galite uždoti daugiau klausimų nuo vidurnakčio (UTC).
          </p>

          {/* Button */}
          <Button onClick={onClose} className="w-full">
            Supratau
          </Button>
        </div>
      </div>
    </div>
  );
}
