# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-20)

**Core value:** Instant, accurate answers to Lithuanian labor law questions — so accountants can confidently handle employment matters for their clients without specialist legal knowledge.
**Current focus:** Phase 6 — Subscription & Billing

## Current Position

Phase: 6 of 8 (Subscription & Billing)
Plan: 4 of 5 in current phase
Status: In progress
Last activity: 2026-01-27 — Completed 06-04-PLAN.md

Progress: ████████░░ 75%

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: 10 min
- Total execution time: 190 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3 | 24 min | 8 min |
| 1.1 | 2 | 52 min | 26 min |
| 1.2 | 3 | 61 min | 20 min |
| 1.3 | 1 | 4 min | 4 min |
| 1.4 | 1 | 4 min | 4 min |
| 4 | 2 | 20 min | 10 min |
| 5 | 1 | 8 min | 8 min |
| 5.4 | 1 | 2 min | 2 min |
| 6 | 4 | 15 min | 4 min |

**Recent Trend:**
- Last 5 plans: 05.4-01 (2m), 06-01 (4m), 06-02 (5m), 06-03 (2m), 06-04 (4m)
- Trend: Progressing

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 01-01 | Use cheerio for HTML parsing | Reliable for Bootstrap-style accordion structure |
| 01-01 | Lazy init Pinecone/GenAI | Enable dry-run mode without env vars |
| 01-02 | VDI FAQ score threshold 0.65 | Match nutarimai filtering for consistency |
| 01-02 | vdiFaqK default 4 | Treat as supplementary source like nutarimai |
| 01-03 | Embed question-only for FAQ | Q+A embeddings caused poor retrieval; question-only gives exact matches |
| 01.1-01 | Use unpdf for PDF extraction | Simpler API than pdf-parse v2, already in deps |
| 01.1-01 | Gemini 2.0 Flash for classification | Fast and accurate for relevance scoring |
| 01.1-02 | 1500 char chunks with 200 overlap | Balance context vs granularity for PDF content |
| 01.1-02 | vdiDocsK default 3 | Supplementary source alongside FAQ (4) and nutarimai (5) |
| 01.2-01 | e-TAR DOCX download for DSS | Same pattern as Darbo Kodeksas for consistency |
| 01.2-01 | lawCode=DSS for DSS Įstatymas | Enables citation formatting: "DSS 12 str." vs "DK 57 str." |
| 01.2-02 | Include all 95 Tier 1+2 docs | LLM classified more as essential/useful than 10-15 target |
| 01.2-02 | category=safety in metadata | Enables filtered search for safety-specific queries |
| 01.2-03 | Shield icon for safety topic | Visual representation of protection/safety theme |
| 01.2-03 | DSS source label format | "DSS X str." differentiates from "DK X str." |
| 01.3-01 | Follow DSS pattern for PSS | Consistent ingestion approach for legislation |
| 01.3-01 | lawCode=PSS for fire safety | Enables citation formatting: "PSS X str." |
| 01.4-01 | Inline stats in prompt | Simpler than runtime loading, ~500 chars |
| 01.4-01 | 35k valid cases from 86k | Only include cases with recorded outcomes |
| 04-02 | Auth after profiling | User sees app value before committing to sign-up |
| 05-01 | Firestore + localStorage dual write | Reliability: Firestore persists, localStorage immediate |
| 05-01 | Migrate localStorage on auth | Seamless upgrade for users who profiled before signing in |
| 05.4-01 | Check Firestore only for returning user | localStorage is for immediate redirect, not profile detection |
| 05.4-01 | Clear topic for returning users | Let them pick fresh topic each session |
| 06-02 | Fire-and-forget startTrial | Non-blocking UX - trial start shouldn't delay message send |
| 06-02 | onSnapshot for SubscriptionContext | Real-time updates when subscription changes (e.g., after webhook) |
| 06-01 | Firebase Admin SDK for server-side auth | Enables secure ID token verification on API routes |
| 06-01 | Stripe customer linked via metadata | Store firebaseUid in Stripe customer metadata for fallback lookup |
| 06-03 | Monthly price as default subscribe button | Yearly available in modal; keep account page simple |
| 06-03 | Lithuanian locale for dates | Match app language (lt-LT) |
| 06-04 | Yearly plan default in modal | Better value for user (14% savings), increases ARPU |
| 06-04 | Suspense wrapper for chat page | Next.js 16 requires useSearchParams in Suspense boundary |

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 06-04-PLAN.md (4/5 plans in Phase 6)
Resume file: None
