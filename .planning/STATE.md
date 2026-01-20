# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-20)

**Core value:** Instant, accurate answers to Lithuanian labor law questions — so accountants can confidently handle employment matters for their clients without specialist legal knowledge.
**Current focus:** Phase 1.1 — VDI Legal Docs

## Current Position

Phase: 1.1 of 7 (VDI Legal Docs)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-01-20 — Completed 01.1-01-PLAN.md

Progress: ██░░░░░░░░ 18%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 8 min
- Total execution time: 31 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3 | 24 min | 8 min |
| 1.1 | 1 | 7 min | 7 min |

**Recent Trend:**
- Last 5 plans: 01-01 (12m), 01-02 (2m), 01-03 (10m), 01.1-01 (7m)
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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-20
Stopped at: Completed 01.1-01-PLAN.md
Resume file: None
