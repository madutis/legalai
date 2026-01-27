'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  title = 'Prenumeruoti LegalAI',
  description = 'Pasirinkite planą',
}: SubscriptionModalProps) {
  const { user } = useAuth();
  const [priceType, setPriceType] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ priceType }),
      });

      if (!response.ok) {
        throw new Error('Nepavyko sukurti mokėjimo sesijos');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError('Klaida kuriant mokėjimo sesiją. Bandykite dar kartą.');
      setIsLoading(false);
    }
  };

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
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Uždaryti"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {title}
          </h2>
          <p className="text-muted-foreground mb-6">
            {description}
          </p>

          {/* Plan selection */}
          <div className="space-y-3 mb-6">
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                priceType === 'monthly'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <input
                type="radio"
                name="priceType"
                value="monthly"
                checked={priceType === 'monthly'}
                onChange={() => setPriceType('monthly')}
                className="w-4 h-4 text-primary"
              />
              <span className="text-foreground">
                <span className="font-medium">29</span> + PVM / mėn.
              </span>
            </label>

            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                priceType === 'yearly'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <input
                type="radio"
                name="priceType"
                value="yearly"
                checked={priceType === 'yearly'}
                onChange={() => setPriceType('yearly')}
                className="w-4 h-4 text-primary"
              />
              <div className="flex items-center gap-2">
                <span className="text-foreground">
                  <span className="font-medium">299</span> + PVM / metai
                </span>
                <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full font-medium">
                  -14%
                </span>
              </div>
            </label>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-destructive text-sm mb-4">{error}</p>
          )}

          {/* Subscribe button */}
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Kraunama...
              </span>
            ) : (
              'Prenumeruoti'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
