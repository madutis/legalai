# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-20)

**Core value:** Instant, accurate answers to Lithuanian labor law questions — so accountants can confidently handle employment matters for their clients without specialist legal knowledge.
**Current focus:** Phase 5 — Auth & Billing (subscription gates)

## Current Position

Phase: 5 of 8 (Account Management)
Plan: 1 of 1 in current phase
Status: Phase complete
Last activity: 2026-01-27 — Completed 05-01-PLAN.md

Progress: ███████░░░ 59%

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 13 min
- Total execution time: 173 min

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

**Recent Trend:**
- Last 5 plans: 01.3-01 (4m), 01.4-01 (4m), 04-01 (10m), 04-02 (10m), 05-01 (8m)
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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 05-01-PLAN.md (Phase 5 complete)
Resume file: None
