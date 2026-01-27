import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from './config';

export interface UserProfile {
  userRole: string;
  companySize: string;
  topic: string;
  updatedAt: Date;
}

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
