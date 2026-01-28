# LegalAI - Darbo teisės asistentas

AI-powered Lithuanian employment law assistant for accountants and HR professionals. Get instant answers to labor law questions based on the Lithuanian Labor Code, Supreme Court rulings, VDI guidance, and government regulations.

**Live**: [legalai.lt](https://legalai.lt)

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **AI**: Google Gemini 2.5 Flash (2.0 Flash fallback)
- **Vector DB**: Pinecone (hybrid RAG retrieval)
- **Database**: Firebase Firestore (users, subscriptions)
- **Auth**: Firebase Authentication (Google OAuth)
- **Payments**: Stripe (subscriptions, billing portal)
- **Email**: MailerSend (transactional emails)
- **Embeddings**: Google embedding-001

## Features

### Core Consultation
- RAG-based answers citing specific legal sources
- Hybrid search: LLM article identification + semantic vector search
- Clickable article references linking to e-TAR (official legal registry)
- LAT ruling modal with case summaries and PDF links
- Context-aware responses based on user role and company size
- PDF export with proper Lithuanian character support

### User Experience
- Onboarding flow: role selection, company size, topic picker
- Returning user optimization: skip profiling if saved
- Dark mode with system detection
- Mobile-responsive design

### Monetization
- 7-day free trial on first consultation
- Stripe-powered subscriptions (monthly/yearly)
- Usage limits: 50 messages/day with warning at 45
- Self-service billing portal

### Legal & Compliance
- Terms of Service and Privacy Policy (Lithuanian)
- GDPR-compliant data handling
- Welcome email on signup

## Data Sources

| Source | Content | Count |
|--------|---------|-------|
| **Darbo kodeksas** | Lithuanian Labor Code | 264 articles |
| **LAT praktika** | Supreme Court rulings | 58 nutartys |
| **VDI DUK** | Labor Inspectorate FAQ | 260 questions |
| **VDI teisės aktai** | Labor Inspectorate legislation | 15 documents |
| **Darbo saugos įstatymas** | Occupational Safety Law | Full text |
| **Priešgaisrinės saugos įstatymas** | Fire Safety Law | 22 articles |
| **LRV nutarimai** | Government regulations | 12 nutarimų |
| **DGK statistika** | Labor dispute outcomes | 86k cases (2013-2025) |

## Setup

```bash
npm install
cp .env.example .env.local
```

Required environment variables:
```
# AI & Search
GOOGLE_GENERATIVE_AI_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=law-agent

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email
MAILERSEND_API_KEY=
```

```bash
npm run dev
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page with profiling
│   ├── chat/page.tsx         # Main consultation interface
│   ├── account/page.tsx      # User profile & subscription
│   ├── sign-in/page.tsx      # Google OAuth sign-in
│   ├── terms/page.tsx        # Terms of Service
│   ├── privacy/page.tsx      # Privacy Policy
│   └── api/
│       ├── chat/route.ts     # Chat API (streaming + usage)
│       ├── article/          # Labor Code article fetch
│       ├── ruling/           # LAT ruling fetch
│       ├── stripe/           # Checkout, portal, webhook
│       └── email/            # Welcome email API
├── components/
│   ├── chat/                 # Chat UI, modals
│   ├── subscription/         # Billing components
│   ├── layout/               # Header, Footer
│   └── ui/                   # shadcn components
├── contexts/
│   └── SubscriptionContext   # App-wide subscription state
├── lib/
│   ├── gemini/               # Gemini API, RAG, prompts
│   ├── pinecone/             # Vector search
│   ├── firebase/             # Auth, Firestore, Admin SDK
│   ├── stripe/               # Stripe client
│   └── email/                # MailerSend, templates
└── hooks/
    └── useChat.ts            # Chat state management
```

## Scripts

```bash
# Ingest documents to Pinecone
npx tsx scripts/ingest-documents.ts

# Sync LAT rulings from lat.lt
npx tsx scripts/sync-lat-rulings.ts

# Process labor dispute statistics
npx tsx scripts/process-dgk-stats.ts
```

## Deployment

Deployed on Vercel with environment variables in dashboard.

```bash
vercel deploy --prod
```

## Operating Entity

**Imum, UAB**
S. Konarskio g. 2-29, LT-03122 Vilnius
labas@legalai.lt

## Disclaimer

This system provides informational consultations only. Not legal advice. For complex cases, consult a qualified lawyer.
