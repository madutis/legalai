'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

export function SubscriptionStatus() {
  const { user } = useAuth();
  const { status, userDoc, trialDaysLeft, isSubscribed } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);

  // Get ID token for authenticated API calls
  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        console.error('Not authenticated');
        return;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceType: 'monthly' }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        console.error('Not authenticated');
        return;
      }

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to create portal session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm overflow-hidden animate-pulse">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <div className="h-5 bg-muted rounded w-40" />
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-4 bg-muted rounded w-48" />
          <div className="h-10 bg-muted rounded w-full mt-4" />
        </div>
      </div>
    );
  }

  // Pre-trial state (no trialStartedAt)
  if (status === 'pre_trial' || !userDoc?.trialStartedAt) {
    return (
      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h2 className="font-medium text-foreground">Išbandykite nemokamai</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Pirmas klausimas aktyvuoja 7 dienų nemokamą prieigą.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Vėliau — €29/mėn.
          </p>
        </div>
      </div>
    );
  }

  // Active subscription
  if (isSubscribed && userDoc?.subscription) {
    const { status: subStatus, currentPeriodEnd, cancelAtPeriodEnd, cancelAt, priceId } = userDoc.subscription;

    // Canceled subscription (access until period end or cancel_at date)
    if (cancelAtPeriodEnd || subStatus === 'canceled') {
      const accessUntil = cancelAt || currentPeriodEnd;
      return (
        <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <h2 className="font-medium text-foreground">Prenumerata atšaukta</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Prieiga iki: {accessUntil.toLocaleDateString('lt-LT')}
            </p>
            <Button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="w-full h-10"
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
                'Atnaujinti prenumeratą'
              )}
            </Button>
          </div>
        </div>
      );
    }

    // Active subscription
    const isYearly = priceId?.includes('yearly') || priceId?.includes('year');
    const priceDisplay = isYearly ? '299/m. + PVM' : '29/men. + PVM';

    return (
      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h2 className="font-medium text-foreground">Aktyvi prenumerata</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">{priceDisplay}</p>
          <p className="text-sm text-muted-foreground">
            Atnaujinama: {currentPeriodEnd.toLocaleDateString('lt-LT')}
          </p>
          <Button
            onClick={handleManageSubscription}
            disabled={isLoading}
            variant="outline"
            className="w-full h-10"
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
              'Tvarkyti prenumeratą'
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Trial expired or subscription expired
  if (status === 'trial_expired' || status === 'subscription_expired') {
    return (
      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h2 className="font-medium text-foreground">
            {status === 'trial_expired'
              ? 'Bandomasis laikotarpis baigesi'
              : 'Prenumerata pasibaigė'}
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Prenumeruokite ir tęskite darbą.
          </p>
          <p className="text-xs text-muted-foreground/80">
            €29/mėn.
          </p>
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full h-10"
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
    );
  }

  // Trial active (trialStartedAt set, no subscription)
  return (
    <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <h2 className="font-medium text-foreground">Bandomasis laikotarpis</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Liko {trialDaysLeft} d.
        </p>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-xs text-muted-foreground/80">
          Vėliau — €29/mėn.
        </p>
        <Button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full h-10"
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
            'Prenumeruoti dabar'
          )}
        </Button>
      </div>
    </div>
  );
}
