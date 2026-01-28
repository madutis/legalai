import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const user = await verifyIdToken(authHeader);

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getAdminFirestore();

    // Check if user has active subscription
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (
      userData?.subscription?.status === 'active' &&
      !userData?.subscription?.cancelAtPeriodEnd
    ) {
      return NextResponse.json(
        { error: 'active_subscription', message: 'Cancel subscription first' },
        { status: 400 }
      );
    }

    // 1. Add email to deletedAccounts (prevent trial abuse on re-signup)
    await db.collection('deletedAccounts').doc(user.email).set({
      deletedAt: FieldValue.serverTimestamp(),
      uid: user.uid,
    });

    // 2. Delete user document
    await userRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
