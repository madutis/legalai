'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING } from '@/lib/constants';

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
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

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
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isVisible ? 'bg-black/50' : 'bg-black/0'
      }`}
      onClick={onClose}
    >
      <div
        className={`relative bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient accent */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-br from-gold/5 via-transparent to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            aria-label="Uždaryti"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M2 6h20" />
              <path d="M4 6l2 8h-4l2-8" />
              <path d="M20 6l2 8h-4l2-8" />
              <path d="M2 14a2 2 0 1 0 4 0" />
              <path d="M18 14a2 2 0 1 0 4 0" />
              <circle cx="12" cy="5" r="1.5" />
            </svg>
          </div>

          <h2 className="font-serif text-xl font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {description}
          </p>
        </div>

        {/* Benefits */}
        <div className="px-6 pt-4 pb-2">
          <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Neribotos konsultacijos</span>
            </li>
            <li className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Konsultaciju issaugojimas</span>
            </li>
          </ul>
        </div>

        {/* Plan selection */}
        <div className="p-6 pt-3 space-y-3">
          {/* Monthly option */}
          <button
            type="button"
            onClick={() => setPriceType('monthly')}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 group ${
              priceType === 'monthly'
                ? 'border-gold bg-gold/5 shadow-sm'
                : 'border-border hover:border-gold/50 hover:bg-muted/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Custom radio indicator */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  priceType === 'monthly'
                    ? 'border-gold bg-gold'
                    : 'border-muted-foreground/30 group-hover:border-gold/50'
                }`}>
                  {priceType === 'monthly' && (
                    <svg className="w-3 h-3 text-gold-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-medium text-foreground">Mėnesinis</div>
                  <div className="text-xs text-muted-foreground">Lankstus pasirinkimas</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-serif text-xl font-semibold text-foreground">
                  {PRICING.monthly.display}<span className="text-sm font-normal text-muted-foreground">/{PRICING.monthly.interval}</span>
                </div>
                <div className="text-xs text-muted-foreground">+ PVM</div>
              </div>
            </div>
          </button>

          {/* Yearly option */}
          <button
            type="button"
            onClick={() => setPriceType('yearly')}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 group relative ${
              priceType === 'yearly'
                ? 'border-gold bg-gold/5 shadow-sm'
                : 'border-border hover:border-gold/50 hover:bg-muted/30'
            }`}
          >
            {/* Savings badge */}
            <div className="absolute -top-2 right-4 px-2 py-0.5 bg-gold text-gold-foreground text-xs font-semibold rounded-full shadow-sm">
              Sutaupykite {PRICING.yearly.savings}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Custom radio indicator */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  priceType === 'yearly'
                    ? 'border-gold bg-gold'
                    : 'border-muted-foreground/30 group-hover:border-gold/50'
                }`}>
                  {priceType === 'yearly' && (
                    <svg className="w-3 h-3 text-gold-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-medium text-foreground">Metinis</div>
                  <div className="text-xs text-muted-foreground">Geriausia vertė</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-serif text-xl font-semibold text-foreground">
                  {PRICING.yearly.display}<span className="text-sm font-normal text-muted-foreground">/{PRICING.yearly.interval}</span>
                </div>
                <div className="text-xs text-muted-foreground">+ PVM (~€{Math.round(PRICING.yearly.amount / 12)}/mėn.)</div>
              </div>
            </div>
          </button>

          {/* Error message */}
          {error && (
            <div role="alert" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Subscribe button */}
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            size="lg"
            className="w-full mt-2 font-medium shadow-md hover:shadow-lg transition-shadow"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner size="md" />
                Nukreipiama į mokėjimą...
              </span>
            ) : (
              <>
                Prenumeruoti
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </Button>

          {/* Security note */}
          <p className="text-center text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5 pt-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Saugus mokėjimas per Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
