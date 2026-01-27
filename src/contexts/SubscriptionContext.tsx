'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase/config';
import { useAuth } from './AuthContext';
import {
  type UserDocument,
  type AccessStatus,
  getAccessStatus,
} from '@/lib/firebase/firestore';

interface SubscriptionContextValue {
  status: 'loading' | AccessStatus;
  userDoc: UserDocument | null;
  trialDaysLeft: number | null;
  isSubscribed: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

function parseUserDocument(data: Record<string, unknown>): UserDocument {
  return {
    userRole: data.userRole as string | undefined,
    companySize: data.companySize as string | undefined,
    topic: data.topic as string | undefined,
    updatedAt: (data.updatedAt as { toDate: () => Date } | undefined)?.toDate(),
    createdAt: (data.createdAt as { toDate: () => Date } | undefined)?.toDate(),
    trialStartedAt: (data.trialStartedAt as { toDate: () => Date } | undefined)?.toDate(),
    stripeCustomerId: data.stripeCustomerId as string | undefined,
    subscription: data.subscription ? {
      status: (data.subscription as Record<string, unknown>).status as 'active' | 'canceled' | 'past_due' | 'expired',
      stripeSubscriptionId: (data.subscription as Record<string, unknown>).stripeSubscriptionId as string,
      priceId: (data.subscription as Record<string, unknown>).priceId as string,
      billingInterval: (data.subscription as Record<string, unknown>).billingInterval as 'month' | 'year' | undefined,
      currentPeriodEnd: ((data.subscription as Record<string, unknown>).currentPeriodEnd as { toDate: () => Date } | undefined)?.toDate() as Date,
      cancelAtPeriodEnd: (data.subscription as Record<string, unknown>).cancelAtPeriodEnd as boolean,
      cancelAt: ((data.subscription as Record<string, unknown>).cancelAt as { toDate: () => Date } | null | undefined)?.toDate() ?? null,
    } : undefined,
  };
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [status, setStatus] = useState<'loading' | AccessStatus>('loading');

  // Set up real-time Firestore listener
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setUserDoc(null);
      setStatus('pre_trial');
      return;
    }

    const db = getFirebaseFirestore();
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (!snapshot.exists()) {
        setUserDoc(null);
        setStatus('pre_trial');
        return;
      }

      const data = snapshot.data();
      const parsedDoc = parseUserDocument(data);
      setUserDoc(parsedDoc);
      setStatus(getAccessStatus(parsedDoc));
    }, (error) => {
      console.error('Error listening to user document:', error);
      setStatus('pre_trial');
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // Calculate trial days left
  const trialDaysLeft = (() => {
    if (!userDoc?.trialStartedAt) return null;
    if (userDoc.subscription) return null; // No trial if subscribed

    const trialEnd = new Date(userDoc.trialStartedAt);
    trialEnd.setDate(trialEnd.getDate() + 7);
    const now = new Date();

    if (now >= trialEnd) return 0;

    const msLeft = trialEnd.getTime() - now.getTime();
    return Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  })();

  // Calculate if user has active subscription
  const isSubscribed = (() => {
    if (!userDoc?.subscription) return false;
    const { status, currentPeriodEnd } = userDoc.subscription;
    return (status === 'active' || status === 'canceled') && currentPeriodEnd > new Date();
  })();

  // Manual refresh function (useful after checkout success)
  const refreshSubscription = useCallback(async () => {
    // The onSnapshot listener will automatically pick up changes
    // This is mainly a placeholder for any future manual refresh logic
    return Promise.resolve();
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        userDoc,
        trialDaysLeft,
        isSubscribed,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
