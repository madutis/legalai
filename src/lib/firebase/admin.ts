import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore, FieldValue } from 'firebase-admin/firestore';
import { DAILY_LIMIT, WARNING_THRESHOLD, getTodayKey } from '@/lib/constants';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;
let adminFirestore: Firestore | undefined;

function getAdminApp(): App {
  if (!adminApp) {
    if (getApps().length === 0) {
      // Use service account credentials if available, otherwise use default
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else {
        // Use application default credentials (for local dev with gcloud auth)
        adminApp = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
    } else {
      adminApp = getApps()[0];
    }
  }
  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    adminFirestore = getFirestore(getAdminApp());
  }
  return adminFirestore;
}

/**
 * Verify Firebase ID token from Authorization header
 * Returns decoded token with uid, email, etc. or null if invalid
 */
export async function verifyIdToken(authHeader: string | null): Promise<{
  uid: string;
  email?: string;
} | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    return null;
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch {
    return null;
  }
}

/**
 * Check if user can send message (server-side)
 * Returns usage status and remaining count
 */
export async function checkUsageLimitAdmin(uid: string, email?: string): Promise<{
  allowed: boolean;
  remaining: number;
  showWarning: boolean;
  reason?: 'limit_reached' | 'deleted_account';
}> {
  const db = getAdminFirestore();

  // Check if user previously deleted account and has no active subscription
  if (email) {
    const deletedRef = db.collection('deletedAccounts').doc(email);
    const deletedSnap = await deletedRef.get();

    if (deletedSnap.exists) {
      // Check if user has active subscription
      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();
      const userData = userSnap.data();

      const hasActiveSubscription =
        userData?.subscription?.status === 'active' ||
        (userData?.subscription?.status === 'canceled' &&
          userData?.subscription?.currentPeriodEnd?.toDate() > new Date());

      if (!hasActiveSubscription) {
        return {
          allowed: false,
          remaining: 0,
          showWarning: false,
          reason: 'deleted_account',
        };
      }
    }
  }

  const todayKey = getTodayKey();
  const usageRef = db.collection('users').doc(uid).collection('usage').doc(todayKey);

  const snapshot = await usageRef.get();
  const count = snapshot.exists ? (snapshot.data()?.questionCount || 0) : 0;

  if (count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0, showWarning: false, reason: 'limit_reached' };
  }

  return {
    allowed: true,
    remaining: DAILY_LIMIT - count,
    showWarning: count >= WARNING_THRESHOLD,
  };
}

/**
 * Increment usage count (server-side, fire and forget)
 */
export async function incrementUsageAdmin(uid: string): Promise<void> {
  const db = getAdminFirestore();
  const todayKey = getTodayKey();
  const usageRef = db.collection('users').doc(uid).collection('usage').doc(todayKey);

  await usageRef.set({
    questionCount: FieldValue.increment(1),
    lastQuestionAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}
