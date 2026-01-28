import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { sendWelcomeEmail } from '@/lib/email/send-welcome';

export async function POST(request: NextRequest) {
  try {
    const { uid, email, name } = await request.json();

    if (!uid || !email) {
      return NextResponse.json(
        { error: 'Missing uid or email' },
        { status: 400 }
      );
    }

    // Check if welcome email was already sent
    const db = getAdminFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (userData?.welcomeEmailSent) {
      // Already sent, don't send again
      return NextResponse.json({ success: true, alreadySent: true });
    }

    // Skip for users who previously deleted account (no trial, misleading email)
    const deletedRef = db.collection('deletedAccounts').doc(email);
    const deletedSnap = await deletedRef.get();
    if (deletedSnap.exists) {
      return NextResponse.json({ success: true, skipped: 'deleted_account' });
    }

    // Send welcome email
    const success = await sendWelcomeEmail({ email, name });

    if (success) {
      // Mark welcome email as sent
      await userRef.set({ welcomeEmailSent: true }, { merge: true });
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Welcome email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
