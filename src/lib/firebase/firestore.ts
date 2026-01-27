import { doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestore } from './config';

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

export async function startTrial(uid: string): Promise<void> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', uid);

  const snapshot = await getDoc(userRef);

  // Only set trialStartedAt if not already set
  if (snapshot.exists() && snapshot.data().trialStartedAt) {
    return;
  }

  await setDoc(userRef, {
    trialStartedAt: new Date(),
  }, { merge: true });
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
  trialEnd.setDate(trialEnd.getDate() + 7);
  if (now < trialEnd) {
    return 'allowed';
  }

  return 'trial_expired';
}

// Usage tracking constants
const DAILY_LIMIT = 50;
const WARNING_THRESHOLD = 45;

// Helper to format today's date as YYYY-MM-DD in UTC
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

// Get today's usage count for a user
export async function getTodayUsage(uid: string): Promise<number> {
  const db = getFirebaseFirestore();
  const todayKey = getTodayKey();
  const usageRef = doc(db, 'users', uid, 'usage', todayKey);

  const snapshot = await getDoc(usageRef);

  if (!snapshot.exists()) {
    return 0;
  }

  return snapshot.data().questionCount || 0;
}

// Increment usage count
export async function incrementUsage(uid: string): Promise<void> {
  const db = getFirebaseFirestore();
  const todayKey = getTodayKey();
  const usageRef = doc(db, 'users', uid, 'usage', todayKey);

  await setDoc(usageRef, {
    questionCount: increment(1),
    lastQuestionAt: serverTimestamp(),
  }, { merge: true });
}

// Check if user can send message
export async function checkUsageLimit(uid: string): Promise<{
  allowed: boolean;
  remaining: number;
  showWarning: boolean;
}> {
  const count = await getTodayUsage(uid);

  if (count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0, showWarning: false };
  }

  return {
    allowed: true,
    remaining: DAILY_LIMIT - count,
    showWarning: count >= WARNING_THRESHOLD,
  };
}
