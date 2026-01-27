import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

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
