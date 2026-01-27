import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { verifyIdToken, getAdminFirestore } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

interface CheckoutRequestBody {
  priceType: 'monthly' | 'yearly';
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const user = await verifyIdToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CheckoutRequestBody = await request.json();
    const { priceType } = body;

    if (!priceType || !['monthly', 'yearly'].includes(priceType)) {
      return NextResponse.json(
        { error: 'Invalid priceType. Must be "monthly" or "yearly".' },
        { status: 400 }
      );
    }

    // Get price ID from env
    const priceId = priceType === 'monthly'
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_YEARLY;

    if (!priceId) {
      console.error(`Missing STRIPE_PRICE_${priceType.toUpperCase()} env var`);
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get or create Stripe customer
    const db = getAdminFirestore();
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    let stripeCustomerId = userData?.stripeCustomerId;

    if (!stripeCustomerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          firebaseUid: user.uid,
        },
      });
      stripeCustomerId = customer.id;

      // Save to Firestore
      await userRef.set(
        { stripeCustomerId },
        { merge: true }
      );
    }

    // Create checkout session
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      customer_update: {
        address: 'auto',
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/chat?checkout=success`,
      cancel_url: `${origin}/account?checkout=canceled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      tax_id_collection: {
        enabled: true,
      },
      automatic_tax: {
        enabled: true,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
