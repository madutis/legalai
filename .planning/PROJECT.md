# LegalAI

## What This Is

A commercial AI assistant for Lithuanian labor law, helping accountants and bookkeepers answer employment-related questions and generate compliant documents. Saves time by eliminating the need to read legislation and saves money by reducing reliance on lawyers for routine questions.

## Core Value

Instant, accurate answers to Lithuanian labor law questions — so accountants can confidently handle employment matters for their clients without specialist legal knowledge.

## Requirements

### Validated

- ✓ RAG-based Q&A for Lithuanian Labor Code — existing
- ✓ Hybrid search across legislation, LAT rulings, nutarimai — existing
- ✓ Streaming AI responses with source citations — existing
- ✓ Article extraction and direct fetch — existing
- ✓ Dark mode support — existing
- ✓ Firebase authentication (basic) — existing
- ✓ PDF export of consultations — existing
- ✓ User context personalization — existing

### Active

- [ ] VDI FAQ ingestion as separate knowledge source
- [ ] Employment contract template generation
- [ ] Landing page with value proposition
- [ ] User onboarding flow
- [ ] User registration and account management
- [ ] Subscription pricing with free trial
- [ ] Billing integration
- [ ] Usage restrictions and limits

### Out of Scope

- Multi-user/team accounts — individual users only for v1
- Other legal domains (tax, corporate, etc.) — labor law only for v1
- Document storage/management — generate but don't store

## Context

**Target user:** Accountants and bookkeepers who handle employment administration for multiple clients. They need quick, reliable answers to labor law questions and help with routine tasks like contract generation.

**Market:** Lithuanian market only for v1. UI and content in Lithuanian.

**Existing codebase:** Full-stack Next.js RAG application with Gemini, Pinecone, Firebase. POC is functional — needs commercialization layer.

**Immediate priority:** Ingest VDI FAQ (https://vdi.lrv.lt/lt/dazniausiai-uzduodami-klausimai/) as a separate citable source in the knowledge base.

## Constraints

- **Stack**: Continue with Next.js, Gemini, Pinecone, Firebase — working well
- **Market**: Lithuania + employment law for v1 — expandable later
- **Pricing**: Subscription model with free trial

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| VDI FAQ as separate source | Transparency — users see when answer comes from official VDI guidance vs legislation | — Pending |
| Subscription with free trial | Predictable revenue, lower barrier to entry | — Pending |
| Minimal/functional landing | Focus on explaining value and converting, not elaborate design | — Pending |
| Individual users only (v1) | Reduce complexity, validate core value first | — Pending |

---
*Last updated: 2026-01-20 after initialization*
