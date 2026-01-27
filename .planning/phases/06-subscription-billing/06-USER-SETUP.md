# Phase 6: User Setup Required

**Generated:** 2026-01-27
**Phase:** 06-subscription-billing
**Status:** Incomplete

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `STRIPE_SECRET_KEY` | Stripe Dashboard -> Developers -> API keys -> Secret key | `.env.local` |
| [ ] | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard -> Developers -> API keys -> Publishable key | `.env.local` |
| [ ] | `STRIPE_PRICE_MONTHLY` | Stripe Dashboard -> Products -> LegalAI -> Monthly price ID | `.env.local` |
| [ ] | `STRIPE_PRICE_YEARLY` | Stripe Dashboard -> Products -> LegalAI -> Yearly price ID | `.env.local` |
| [ ] | `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard -> Developers -> Webhooks -> Signing secret | `.env.local` |
| [ ] | `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Console -> Project Settings -> Service accounts -> Generate new private key (JSON string) | `.env.local` |

## Dashboard Configuration

### 1. Create Product and Prices
- **Location:** Stripe Dashboard -> Products -> Add product
- **Details:**
  - Name: LegalAI Subscription
  - Monthly price: EUR 29.00/month, recurring
  - Yearly price: EUR 299.00/year, recurring
  - Copy the price IDs (e.g., `price_xxx`) for env vars

### 2. Enable Stripe Tax
- **Location:** Stripe Dashboard -> Settings -> Tax
- **Details:**
  - Add business address (Lithuania)
  - Set tax behavior to "exclusive" (price + VAT shown separately)

### 3. Configure Customer Portal
- **Location:** Stripe Dashboard -> Settings -> Billing -> Customer portal
- **Details:**
  - Enable: Cancel subscription
  - Enable: Update payment method
  - Enable: View invoices
  - Disable: Switch plans (keep simple for now)

### 4. Create Webhook Endpoint (Production)
- **Location:** Stripe Dashboard -> Developers -> Webhooks -> Add endpoint
- **URL:** `https://[your-domain]/api/stripe/webhook`
- **Events to listen for:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- **Copy the signing secret** for `STRIPE_WEBHOOK_SECRET`

## Local Development

For local webhook testing, use the Stripe CLI:

```bash
# Install Stripe CLI (if not installed)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI will output a webhook signing secret (starts with `whsec_`). Use this for local `STRIPE_WEBHOOK_SECRET`.

## Firebase Admin Setup

For server-side authentication, you need Firebase Admin credentials:

1. Go to Firebase Console -> Project Settings -> Service accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Convert to a single-line JSON string
5. Add to `.env.local` as `FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'`

Alternatively, for local development with gcloud CLI:
```bash
gcloud auth application-default login
```

## Verification

After completing setup, verify:

```bash
# Check env vars are set
grep STRIPE .env.local
grep FIREBASE_SERVICE_ACCOUNT .env.local

# Start dev server
npm run dev

# In another terminal, test webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger a test event
stripe trigger checkout.session.completed
```

---
**Once all items complete:** Mark status as "Complete"
