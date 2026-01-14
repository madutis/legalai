# External Integrations

**Analysis Date:** 2026-01-14

## APIs & External Services

**AI/LLM:**
- Google Gemini API - Primary LLM for RAG responses
  - SDK/Client: @google/generative-ai v0.24.1, @ai-sdk/google v2.0.49
  - Auth: API key in `GOOGLE_GENERATIVE_AI_API_KEY` env var
  - Models: `gemini-2.5-flash` (primary), `gemini-2.0-flash` (fallback)
  - Embeddings: `text-embedding-004`
  - Usage: `src/lib/gemini/index.ts`

**Payment Processing:**
- Not applicable

**Email/SMS:**
- Not applicable

**External APIs:**
- E-TAR (Lithuanian Legal Registry) - Official legal document links
  - URL: `https://www.e-tar.lt/portal/lt/legalAct/...`
  - Usage: Links to Labor Code articles (`src/lib/pdf-export.ts`, `src/app/api/article/[articleNumber]/route.ts`)

- LAT Website (Lithuanian Supreme Court) - Source for court rulings
  - URL: `https://www.lat.lt/teismu-praktika/...`
  - Usage: PDF scraping in `scripts/lat/1-download.ts`

## Data Storage

**Databases:**
- Firebase Firestore - User data and consultation history
  - Client: firebase v12.7.0 (`src/lib/firebase/config.ts`)
  - Project ID: `legal-ai-74fd2`
  - Collections: `users`, `consultations`, `consultations/{id}/messages`

- SQLite - LAT ruling storage
  - Client: better-sqlite3 v12.6.0 (`src/lib/db/index.ts`)
  - Location: `data/lat.db`
  - Tables: `lat_pdfs`, `lat_cases`, `lat_vectors`
  - Mode: Read-only in serverless (Vercel compatibility)

**Vector Database:**
- Pinecone - Semantic search for RAG
  - SDK/Client: @pinecone-database/pinecone v6.1.3
  - Auth: API key in `PINECONE_API_KEY` env var
  - Index: `law-agent` (configurable via `PINECONE_INDEX`)
  - Document types: legislation, lat_ruling, nutarimas
  - Usage: `src/lib/pinecone/index.ts`

**File Storage:**
- Local filesystem - PDF storage in `data/lat-pdfs/`
- Firebase Storage - Potential use (bucket configured)

**Caching:**
- None currently implemented

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication (`src/lib/firebase/auth.ts`)
  - Methods: Email/password, Google OAuth
  - Token storage: Firebase SDK handles automatically
  - Session management: Firebase Auth state listener

**OAuth Integrations:**
- Google OAuth - Social sign-in via Firebase
  - Configured in Firebase console
  - Used in `src/lib/firebase/auth.ts`

## Monitoring & Observability

**Error Tracking:**
- None configured

**Analytics:**
- None configured

**Logs:**
- Vercel logs (stdout/stderr)
- Console logging in development

## CI/CD & Deployment

**Hosting:**
- Vercel - Next.js serverless hosting
  - Deployment: Git-based (push to main)
  - Environment vars: Configured in Vercel dashboard
  - Config: `.vercel/` directory

**CI Pipeline:**
- Not configured (no GitHub Actions workflows)

## Environment Configuration

**Development:**
- Required env vars:
  - `GOOGLE_GENERATIVE_AI_API_KEY`
  - `PINECONE_API_KEY`
  - `PINECONE_INDEX`
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `GOOGLE_CLOUD_PROJECT`
  - `GOOGLE_APPLICATION_CREDENTIALS`
- Secrets location: `.env.local` (gitignored)
- Mock services: None (uses real APIs)

**Production:**
- Secrets management: Vercel environment variables
- Database: Pinecone (cloud), Firebase (cloud), SQLite (bundled)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-01-14*
*Update when adding/removing external services*
