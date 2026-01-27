import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { getAdminFirestore } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

// Map Stripe subscription status to our simplified status
function mapSubscriptionStatus(stripeStatus: string): 'active' | 'canceled' | 'past_due' | 'expired' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    default:
      return 'expired';
  }
}

// Find user by Stripe customer ID
async function findUserByCustomerId(customerId: string) {
  const db = getAdminFirestore();
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  return {
    uid: snapshot.docs[0].id,
    ref: snapshot.docs[0].ref,
    data: snapshot.docs[0].data(),
  };
}

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET env var');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle events
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(invoice);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      // Log error but return 200 to prevent Stripe from retrying
      console.error(`Error processing ${event.type}:`, err);
    }

    // Always return 200 after processing
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 even on error to prevent retry loops
    return NextResponse.json({ received: true });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!subscriptionId) {
    console.log('No subscription in checkout session');
    return;
  }

  // Find user by customer ID
  const user = await findUserByCustomerId(customerId);
  if (!user) {
    // Try to find by metadata firebaseUid
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      console.error('Customer has been deleted');
      return;
    }
    const firebaseUid = customer.metadata?.firebaseUid;
    if (!firebaseUid) {
      console.error('Could not find user for customer:', customerId);
      return;
    }
    // Get user by firebaseUid
    const db = getAdminFirestore();
    const userRef = db.collection('users').doc(firebaseUid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      console.error('User document not found for uid:', firebaseUid);
      return;
    }

    // Retrieve subscription details
    const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionData = subscriptionResponse as Stripe.Subscription;
    const firstItem = subscriptionData.items.data[0];

    // Update Firestore with subscription data
    await userRef.update({
      subscription: {
        status: 'active',
        stripeSubscriptionId: subscriptionData.id,
        priceId: firstItem.price.id,
        currentPeriodEnd: new Date(firstItem.current_period_end * 1000),
        cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
      },
    });
    return;
  }

  // Retrieve subscription details
  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionData = subscriptionResponse as Stripe.Subscription;
  const firstItem = subscriptionData.items.data[0];

  // Update Firestore with subscription data
  await user.ref.update({
    subscription: {
      status: 'active',
      stripeSubscriptionId: subscriptionData.id,
      priceId: firstItem.price.id,
      currentPeriodEnd: new Date(firstItem.current_period_end * 1000),
      cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
    },
  });

  console.log(`Subscription activated for user: ${user.uid}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error('Could not find user for customer:', customerId);
    return;
  }

  const firstItem = subscription.items.data[0];

  // Update subscription fields
  await user.ref.update({
    'subscription.status': mapSubscriptionStatus(subscription.status),
    'subscription.currentPeriodEnd': new Date(firstItem.current_period_end * 1000),
    'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
    'subscription.priceId': firstItem.price.id,
  });

  console.log(`Subscription updated for user: ${user.uid}, status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error('Could not find user for customer:', customerId);
    return;
  }

  // Set status to expired
  await user.ref.update({
    'subscription.status': 'expired',
  });

  console.log(`Subscription deleted for user: ${user.uid}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error('Could not find user for customer:', customerId);
    return;
  }

  // Set status to past_due
  await user.ref.update({
    'subscription.status': 'past_due',
  });

  console.log(`Payment failed for user: ${user.uid}`);
}
