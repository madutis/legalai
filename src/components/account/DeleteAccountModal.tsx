'use client';

import { useState } from 'react';
import { deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAccountModal({ isOpen, onClose, onDeleted }: DeleteAccountModalProps) {
  const { user } = useAuth();
  const { userDoc } = useSubscription();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Check if subscription is actively renewing (not cancelled)
  const hasActiveSubscription =
    userDoc?.subscription?.status === 'active' &&
    !userDoc?.subscription?.cancelAtPeriodEnd;

  const handleDelete = async () => {
    if (!user?.email) return;

    setIsDeleting(true);
    setError(null);

    try {
      // 1. Call API to delete Firestore data (uses Admin SDK)
      const token = await user.getIdToken();
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'active_subscription') {
          setError('Pirmiausia atšaukite prenumeratą.');
          setIsDeleting(false);
          return;
        }
        throw new Error(data.error || 'Failed to delete account');
      }

      // 2. Clear local storage
      localStorage.removeItem('legalai-context');
      localStorage.removeItem('legalai-terms-accepted');

      // 3. Re-authenticate and delete Firebase Auth account
      try {
        await deleteUser(user);
      } catch (authErr: unknown) {
        // If requires recent login, re-authenticate with Google
        if (authErr instanceof Error && 'code' in authErr && authErr.code === 'auth/requires-recent-login') {
          const provider = new GoogleAuthProvider();
          await reauthenticateWithPopup(user, provider);
          await deleteUser(user);
        } else {
          throw authErr;
        }
      }

      onDeleted();
    } catch (err) {
      console.error('Failed to delete account:', err);
      setError('Nepavyko ištrinti paskyros. Bandykite dar kartą.');
      setIsDeleting(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
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
    } catch (err) {
      console.error('Failed to create portal session:', err);
    }
  };

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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Ištrinti paskyrą?
          </h2>

          {hasActiveSubscription ? (
            <>
              <p className="text-muted-foreground mb-6">
                Pirmiausia atšaukite prenumeratą, tada galėsite ištrinti paskyrą.
              </p>
              <div className="space-y-3">
                <Button onClick={handleManageSubscription} className="w-full">
                  Tvarkyti prenumeratą
                </Button>
                <Button onClick={onClose} variant="outline" className="w-full">
                  Atšaukti
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">
                Visi jūsų duomenys bus ištrinti negrįžtamai.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  variant="destructive"
                  className="w-full"
                >
                  {isDeleting ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      Trinama...
                    </span>
                  ) : (
                    'Ištrinti paskyrą'
                  )}
                </Button>
                <Button
                  onClick={onClose}
                  disabled={isDeleting}
                  variant="outline"
                  className="w-full"
                >
                  Atšaukti
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
