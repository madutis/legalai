'use client';

import { useEffect, useState } from 'react';

interface UsageWarningProps {
  remaining: number;
  onDismiss: () => void;
}

export function UsageWarning({ remaining, onDismiss }: UsageWarningProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 200); // Wait for fade out animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      role="alert"
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-gold/10 border border-gold/20 rounded-lg shadow-lg transition-all duration-200 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <svg
        className="w-5 h-5 text-gold flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span className="text-foreground text-sm font-medium">
        Liko {remaining} {remaining === 1 ? 'klausimas' : remaining < 10 ? 'klausimai' : 'klausimų'} šiandien
      </span>
      <button
        onClick={handleDismiss}
        className="ml-2 text-gold hover:text-gold-foreground transition-colors"
        aria-label="Uždaryti"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
