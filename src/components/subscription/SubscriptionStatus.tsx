'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SubscriptionModal } from './SubscriptionModal';
import { PRICING, TRIAL_DURATION_DAYS } from '@/lib/constants';

export function SubscriptionStatus() {
  const { user } = useAuth();
  const { status, userDoc, trialDaysLeft, isSubscribed, isDeletedAccount } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Get ID token for authenticated API calls
  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
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

  // Determine content based on status
  const renderContent = () => {
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

    // Deleted account re-registered - no trial, must subscribe
    if (isDeletedAccount && !isSubscribed) {
      return (
        <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <h2 className="font-medium text-foreground">Prenumerata reikalinga</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Prenumeruokite, kad galėtumėte naudotis konsultacijomis.
            </p>
            <Button
              onClick={() => setShowModal(true)}
              size="lg" className="w-full"
            >
              Prenumeruoti
            </Button>
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
              Pirmas klausimas aktyvuoja {TRIAL_DURATION_DAYS} dienų nemokamą prieigą.
            </p>
            <p className="text-xs text-muted-foreground/80">
              Vėliau — {PRICING.monthly.display}/{PRICING.monthly.interval}
            </p>
          </div>
        </div>
      );
    }

    // Active subscription
    if (isSubscribed && userDoc?.subscription) {
      const { status: subStatus, currentPeriodEnd, cancelAtPeriodEnd, cancelAt, billingInterval } = userDoc.subscription;

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
                onClick={() => setShowModal(true)}
                size="lg" className="w-full"
              >
                Atnaujinti prenumeratą
              </Button>
            </div>
          </div>
        );
      }

      // Active subscription
      const isYearly = billingInterval === 'year';
      const priceDisplay = isYearly
        ? `${PRICING.yearly.display}/${PRICING.yearly.interval} + PVM`
        : `${PRICING.monthly.display}/${PRICING.monthly.interval} + PVM`;

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
              size="lg" className="w-full"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
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
                ? 'Bandomasis laikotarpis baigėsi'
                : 'Prenumerata pasibaigė'}
            </h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Prenumeruokite ir tęskite darbą.
            </p>
            <Button
              onClick={() => setShowModal(true)}
              size="lg" className="w-full"
            >
              Prenumeruoti
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
            Vėliau — {PRICING.monthly.display}/{PRICING.monthly.interval}
          </p>
          <Button
            onClick={() => setShowModal(true)}
            size="lg" className="w-full"
          >
            Prenumeruoti dabar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      <SubscriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
