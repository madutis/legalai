import {
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type ActionCodeSettings,
} from 'firebase/auth';
import { getFirebaseAuth } from './config';

const MAGIC_LINK_EMAIL_KEY = 'legalai_magic_link_email';

export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function sendMagicLink(email: string, actionCodeSettings: ActionCodeSettings) {
  const auth = getFirebaseAuth();
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  // Store email for verification after redirect
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MAGIC_LINK_EMAIL_KEY, email);
  }
}

export async function completeMagicLinkSignIn() {
  const auth = getFirebaseAuth();

  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return null;
  }

  let email = window.localStorage.getItem(MAGIC_LINK_EMAIL_KEY);

  if (!email) {
    // User opened link on different device, prompt for email
    email = window.prompt('Patvirtinkite savo el. pašto adresą:');
  }

  if (!email) {
    return null;
  }

  const result = await signInWithEmailLink(auth, email, window.location.href);

  // Clean up
  window.localStorage.removeItem(MAGIC_LINK_EMAIL_KEY);

  return result;
}

export function isMagicLinkCallback(): boolean {
  if (typeof window === 'undefined') return false;
  const auth = getFirebaseAuth();
  return isSignInWithEmailLink(auth, window.location.href);
}
