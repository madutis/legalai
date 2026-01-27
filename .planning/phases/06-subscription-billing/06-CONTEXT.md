# Phase 6: Subscription & Billing - Context

## Overview

Implement subscription-based monetization with 7-day free trial, Stripe payment integration, and fair use limits.

**Business model:**
- 7-day free trial (starts on first chat message)
- €29/mo + VAT or €299/yr + VAT (~14% discount)
- Full lockout after trial expires (must subscribe)
- Stripe Tax for automatic VAT handling
- Fair use: 50 questions/day (abuse prevention, not value limiting)

## User Flows

### New User Journey
1. Sign up via Google OAuth
2. Complete onboarding (role, company size, topic)
3. Enter chat → **trial starts** (trialStartedAt set)
4. Use freely for 7 days
5. Day 7: trial expires → modest popup on chat access → Stripe Checkout
6. Subscribe → full access continues

### Returning Subscribed User
1. Sign in
2. Full access to chat
3. Account page shows: plan, renewal date, "Manage Subscription" → Stripe Portal

### Trial Expired User (No Payment)
1. Sign in
2. Can access homepage, account page
3. Attempt chat → subscription modal appears
4. Click subscribe → Stripe Checkout
5. Success → optimistic unlock → chat access restored

### Subscription Cancellation
1. Account page → "Manage Subscription" → Stripe Customer Portal
2. Cancel in Portal → `cancelAtPeriodEnd: true`
3. Access continues until `currentPeriodEnd`
4. After period ends → status becomes `expired` → lockout

### Fair Use Limit Hit
1. User sends question #46 → warning toast: "Liko 5 klausimai šiandien"
2. User sends question #50 → processed normally
3. User tries question #51 → soft block modal: "Dienos limitas pasiektas. Bandykite rytoj."
4. Resets at midnight UTC

## Data Model

### Firestore: `users/{uid}`

```typescript
interface UserDocument {
  // Profile (existing)
  userRole?: string;
  companySize?: string;
  topic?: string;
  updatedAt?: Date;

  // Subscription (new)
  createdAt: Date;                    // Account creation time
  trialStartedAt?: Date;              // Set on first chat message
  stripeCustomerId?: string;          // Created on first checkout

  subscription?: {
    status: 'active' | 'canceled' | 'past_due' | 'expired';
    stripeSubscriptionId: string;
    priceId: string;                  // price_monthly or price_yearly
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  };
}
```

### Firestore: `users/{uid}/usage/{YYYY-MM-DD}`

```typescript
interface UsageDocument {
  questionCount: number;
  lastQuestionAt: Date;
}
```

### Subscription Status Logic

```typescript
type AccessStatus = 'allowed' | 'trial_expired' | 'subscription_expired' | 'limit_reached';

function getAccessStatus(user: UserDocument, todayUsage: number): AccessStatus {
  const now = new Date();

  // Check fair use limit first
  if (todayUsage >= 50) {
    return 'limit_reached';
  }

  // Has active/canceled subscription with valid period?
  if (user.subscription) {
    const { status, currentPeriodEnd } = user.subscription;
    if ((status === 'active' || status === 'canceled') && currentPeriodEnd > now) {
      return 'allowed';
    }
    return 'subscription_expired';
  }

  // In trial period?
  if (user.trialStartedAt) {
    const trialEnd = new Date(user.trialStartedAt);
    trialEnd.setDate(trialEnd.getDate() + 7);
    if (now < trialEnd) {
      return 'allowed';
    }
    return 'trial_expired';
  }

  // Never started trial - first chat will start it
  return 'allowed';
}
```

## API Routes

### `POST /api/stripe/create-checkout-session`

Creates Stripe Checkout session for subscription.

**Request:**
```typescript
{ priceType: 'monthly' | 'yearly' }
```

**Response:**
```typescript
{ url: string }  // Stripe Checkout URL
```

**Logic:**
1. Get authenticated user
2. Get or create Stripe customer (save `stripeCustomerId` to Firestore)
3. Create Checkout Session with:
   - `mode: 'subscription'`
   - `customer: stripeCustomerId`
   - `line_items: [{ price: priceId, quantity: 1 }]`
   - `success_url: /chat?checkout=success`
   - `cancel_url: /account?checkout=canceled`
   - `tax_id_collection: { enabled: true }` (for VAT number)
   - `automatic_tax: { enabled: true }` (Stripe Tax)
4. Return checkout URL

### `POST /api/stripe/create-portal-session`

Creates Stripe Customer Portal session for subscription management.

**Response:**
```typescript
{ url: string }  // Stripe Portal URL
```

**Logic:**
1. Get authenticated user
2. Get `stripeCustomerId` from Firestore
3. Create Portal Session with `return_url: /account`
4. Return portal URL

### `POST /api/stripe/webhook`

Handles Stripe webhook events.

**Events to handle:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set subscription data in Firestore |
| `customer.subscription.updated` | Update status, period end, cancelAtPeriodEnd |
| `customer.subscription.deleted` | Set status to 'expired' |
| `invoice.payment_failed` | Set status to 'past_due' |

**Security:**
- Verify webhook signature with `STRIPE_WEBHOOK_SECRET`
- Return 200 immediately, process async if needed

## Component Architecture

### New Files

```
src/
├── contexts/
│   └── SubscriptionContext.tsx      # Subscription state provider
├── lib/
│   └── stripe/
│       └── client.ts                # Stripe client initialization
├── app/
│   └── api/
│       └── stripe/
│           ├── create-checkout-session/route.ts
│           ├── create-portal-session/route.ts
│           └── webhook/route.ts
└── components/
    └── subscription/
        ├── SubscriptionStatus.tsx   # Account page card
        ├── SubscriptionModal.tsx    # Trial expired prompt
        └── UsageWarning.tsx         # Fair use warning toast
```

### SubscriptionContext

Provides subscription state app-wide:

```typescript
interface SubscriptionContextValue {
  status: 'loading' | 'allowed' | 'trial_expired' | 'subscription_expired' | 'limit_reached';
  subscription: UserSubscription | null;
  trialDaysLeft: number | null;
  todayUsage: number;
  refreshSubscription: () => Promise<void>;
}
```

- Listens to Firestore user document (real-time updates)
- Fetches today's usage count
- Exposes helper for components to check access

### SubscriptionStatus (Account Page)

Shows in account page:

**During trial:**
```
┌─────────────────────────────────────┐
│ Bandomasis laikotarpis              │
│ Liko 5 dienos                       │
│                                     │
│ Po bandomojo laikotarpio:           │
│ €29/mėn. + PVM arba €299/m. + PVM   │
│                                     │
│ [Prenumeruoti dabar]                │
└─────────────────────────────────────┘
```

**Active subscription:**
```
┌─────────────────────────────────────┐
│ Aktyvi prenumerata                  │
│ €29/mėn. + PVM                      │
│ Atnaujinama: 2026-02-27             │
│                                     │
│ [Tvarkyti prenumeratą]              │
└─────────────────────────────────────┘
```

**Canceled (access until period end):**
```
┌─────────────────────────────────────┐
│ Prenumerata atšaukta                │
│ Prieiga iki: 2026-02-27             │
│                                     │
│ [Atnaujinti prenumeratą]            │
└─────────────────────────────────────┘
```

### SubscriptionModal

Modest modal shown when trial expired user tries to access chat:

```
┌─────────────────────────────────────┐
│         [dismiss X]                 │
│                                     │
│  Bandomasis laikotarpis baigėsi     │
│                                     │
│  Tęskite naudojimąsi LegalAI        │
│                                     │
│  ○ €29/mėn. + PVM                   │
│  ○ €299/m. + PVM (sutaupote 14%)    │
│                                     │
│  [Prenumeruoti]                     │
│                                     │
└─────────────────────────────────────┘
```

- Not full-screen takeover
- Centered, modest size
- Dismissable (but chat still blocked)
- Radio buttons for plan selection
- Single CTA → Stripe Checkout

### UsageWarning

Toast notification when 5 questions remaining:

```
┌─────────────────────────────────────┐
│ ⚠ Liko 5 klausimai šiandien         │
└─────────────────────────────────────┘
```

Auto-dismisses after 5 seconds.

### UsageLimitModal

Shown when daily limit reached:

```
┌─────────────────────────────────────┐
│  Dienos limitas pasiektas           │
│                                     │
│  Galite užduoti daugiau klausimų    │
│  nuo vidurnakčio (UTC).             │
│                                     │
│  [Supratau]                         │
└─────────────────────────────────────┘
```

## Stripe Configuration

### Products & Prices

Create in Stripe Dashboard:

**Product:** LegalAI Subscription

**Prices:**
- `price_monthly`: €29.00/month, recurring
- `price_yearly`: €299.00/year, recurring

### Stripe Tax Setup

1. Enable Stripe Tax in Dashboard
2. Set business address (Lithuania)
3. Set tax behavior: **exclusive** (price + VAT shown separately)
4. Enable automatic tax calculation on Checkout

### Customer Portal Configuration

Enable in Stripe Dashboard:
- ✓ Cancel subscription
- ✓ Update payment method
- ✓ View invoices
- ✗ Switch plans (keep simple for now)

### Webhook Endpoint

Register in Stripe Dashboard:
- URL: `https://yourdomain.com/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

## Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Price IDs (from Stripe Dashboard)
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
```

## Edge Cases

### Payment Success but Webhook Delayed

- User completes Stripe Checkout
- Redirected to `/chat?checkout=success`
- Chat page sees `?checkout=success`, shows brief "Processing..." then optimistically allows access
- Webhook arrives shortly after, confirms subscription in Firestore
- If webhook fails, Stripe retries for 3 days

### User in Mid-Chat When Trial Expires

- Let current response complete
- Block next message with subscription modal
- No mid-response interruption

### Multiple Browser Tabs

- SubscriptionContext listens to Firestore in real-time
- When subscription updates, all tabs reflect immediately
- No need to refresh

### Failed Renewal Payment

- Stripe retries automatically (Smart Retries)
- We receive `invoice.payment_failed` → set status to `past_due`
- User still has access during retry window (Stripe default: ~7 days of retries)
- If all retries fail → `customer.subscription.deleted` → status `expired`

### User Changes Google Account

- Different UID = different user = new trial
- No way to link accounts (keep simple)

### Concurrent Question Sends

- Increment usage count atomically (Firestore increment)
- Check count before processing, not after
- Slight race condition acceptable (might get 51 questions, not critical)

## Fair Use Implementation

### On Chat Message Send

```typescript
async function canSendMessage(uid: string): Promise<{
  allowed: boolean;
  remaining: number;
  showWarning: boolean;
}> {
  const today = formatDate(new Date(), 'yyyy-MM-dd'); // UTC
  const usageRef = doc(db, 'users', uid, 'usage', today);
  const usageSnap = await getDoc(usageRef);

  const count = usageSnap.exists() ? usageSnap.data().questionCount : 0;

  if (count >= 50) {
    return { allowed: false, remaining: 0, showWarning: false };
  }

  return {
    allowed: true,
    remaining: 50 - count,
    showWarning: count >= 45, // Show warning when 5 or fewer remaining
  };
}

async function incrementUsage(uid: string): Promise<void> {
  const today = formatDate(new Date(), 'yyyy-MM-dd');
  const usageRef = doc(db, 'users', uid, 'usage', today);

  await setDoc(usageRef, {
    questionCount: increment(1),
    lastQuestionAt: serverTimestamp(),
  }, { merge: true });
}
```

### Usage Logging

Usage documents automatically serve as logs:
- One document per user per day
- Can query for abuse patterns
- Easy to aggregate for analytics

## Security Considerations

### Webhook Verification

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  // Process event...
}
```

### Server-Side Enforcement

- All subscription checks happen server-side in API routes
- Client-side checks are for UX only (show/hide modals)
- Chat API route `/api/chat` must verify subscription status before processing

### Firestore Rules

```javascript
match /users/{uid} {
  allow read: if request.auth.uid == uid;
  allow write: if request.auth.uid == uid
    && !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['subscription', 'stripeCustomerId', 'trialStartedAt']);
  // Subscription fields only writable by admin/webhook
}
```

## Testing Strategy

### Local Development

1. Use Stripe test mode keys
2. Stripe CLI for webhook forwarding: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires auth: `4000 0025 0000 3155`

### Test Scenarios

- [ ] New user → first chat → trial starts
- [ ] Trial user → 7 days pass → blocked → subscribe → access
- [ ] Subscribed user → cancel → access until period end → blocked
- [ ] Subscribed user → payment fails → past_due → eventually blocked
- [ ] User hits 50 questions → blocked → next day → allowed
- [ ] Warning toast at 45 questions

## Implementation Order (Suggested)

1. **Stripe setup** - Create products, prices, configure Tax, Portal
2. **Data model** - Update Firestore schema, add subscription fields
3. **SubscriptionContext** - Core state management
4. **API routes** - Checkout, Portal, Webhook
5. **Account page** - Subscription status card
6. **Chat gating** - Subscription modal for expired users
7. **Trial start** - Set trialStartedAt on first chat
8. **Fair use** - Usage tracking, warnings, limits
9. **Testing** - Full flow verification

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Trial start | First chat message |
| Price display | €29 + VAT (exclusive) |
| VAT handling | Stripe Tax (0.5% fee) |
| Cancel behavior | Access until period end |
| Fair use limit | 50/day, soft warning at 5 left |
| Post-payment UX | Optimistic unlock |
| Subscription management | Stripe Customer Portal |
| Daily reset | Midnight UTC |
