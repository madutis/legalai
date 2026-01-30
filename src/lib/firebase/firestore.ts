import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { TRIAL_DURATION_DAYS } from '@/lib/constants';

export interface UserProfile {
  userRole: string;
  companySize: string;
  topic: string;
  updatedAt: Date;
}

export interface UserSubscription {
  status: 'active' | 'canceled' | 'past_due' | 'expired';
  stripeSubscriptionId: string;
  priceId: string;
  billingInterval?: 'month' | 'year';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelAt?: Date | null;
}

export interface UserDocument {
  // Profile fields
  userRole?: string;
  companySize?: string;
  topic?: string;
  updatedAt?: Date;

  // Subscription fields
  createdAt?: Date;
  trialStartedAt?: Date;
  stripeCustomerId?: string;
  subscription?: UserSubscription;

  // Save preference
  saveByDefault?: boolean;  // undefined treated as true
}

export type AccessStatus = 'allowed' | 'trial_expired' | 'subscription_expired' | 'pre_trial';

export async function saveUserProfile(uid: string, profile: Omit<UserProfile, 'updatedAt'>): Promise<void> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', uid);

  await setDoc(userRef, {
    ...profile,
    updatedAt: new Date(),
  }, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', uid);

  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  // Check if profile has required fields
  if (!data.userRole || !data.companySize || !data.topic) {
    return null;
  }

  return {
    userRole: data.userRole,
    companySize: data.companySize,
    topic: data.topic,
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

export async function getUserDocument(uid: string): Promise<UserDocument | null> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', uid);

  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return {
    userRole: data.userRole,
    companySize: data.companySize,
    topic: data.topic,
    updatedAt: data.updatedAt?.toDate(),
    createdAt: data.createdAt?.toDate(),
    trialStartedAt: data.trialStartedAt?.toDate(),
    stripeCustomerId: data.stripeCustomerId,
    subscription: data.subscription ? {
      status: data.subscription.status,
      stripeSubscriptionId: data.subscription.stripeSubscriptionId,
      priceId: data.subscription.priceId,
      currentPeriodEnd: data.subscription.currentPeriodEnd?.toDate(),
      cancelAtPeriodEnd: data.subscription.cancelAtPeriodEnd,
    } : undefined,
  };
}

export async function checkDeletedAccount(email: string): Promise<boolean> {
  try {
    const db = getFirebaseFirestore();
    const deletedRef = doc(db, 'deletedAccounts', email);
    const snapshot = await getDoc(deletedRef);
    return snapshot.exists();
  } catch {
    return false;
  }
}

export async function startTrial(uid: string, email?: string): Promise<boolean> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', uid);

  const snapshot = await getDoc(userRef);

  // Only set trialStartedAt if not already set
  if (snapshot.exists() && snapshot.data().trialStartedAt) {
    return true;
  }

  // Check if user previously deleted account (no free trial)
  if (email) {
    const wasDeleted = await checkDeletedAccount(email);
    if (wasDeleted) {
      return false; // Trial not started - user must subscribe
    }
  }

  await setDoc(userRef, {
    trialStartedAt: new Date(),
  }, { merge: true });
  return true;
}

export function getAccessStatus(user: UserDocument | null): AccessStatus {
  if (!user || !user.trialStartedAt) {
    return 'pre_trial';
  }

  const now = new Date();

  // Has active/canceled subscription with valid period?
  if (user.subscription) {
    const { status, currentPeriodEnd } = user.subscription;
    if ((status === 'active' || status === 'canceled') && currentPeriodEnd > now) {
      return 'allowed';
    }
    return 'subscription_expired';
  }

  // In trial period?
  const trialEnd = new Date(user.trialStartedAt);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);
  if (now < trialEnd) {
    return 'allowed';
  }

  return 'trial_expired';
}

/**
 * Get user's save-by-default preference.
 * Defaults to true per CONTEXT.md
 */
export async function getSaveByDefault(uid: string): Promise<boolean> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);
  // Default true per CONTEXT.md
  return snapshot.exists() ? (snapshot.data().saveByDefault ?? true) : true;
}

/**
 * Set user's save-by-default preference.
 */
export async function setSaveByDefault(uid: string, value: boolean): Promise<void> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { saveByDefault: value }, { merge: true });
}
