# Roadmap: LegalAI

## Overview

Transform the existing LegalAI POC into a commercial product for Lithuanian accountants. Starting with VDI FAQ integration (immediate priority), then building out document generation, user acquisition (landing page, onboarding), and monetization (subscriptions, billing, usage controls).

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: VDI FAQ Ingestion** - Add VDI FAQ as citable knowledge source
- [ ] **Phase 1.1: VDI Legal Docs** - Selective ingestion of VDI teisės aktai (INSERTED)
- [ ] **Phase 2: Contract Templates** - Employment contract template generation
- [ ] **Phase 3: Landing Page** - Value proposition page for conversion
- [ ] **Phase 4: User Onboarding** - Registration and onboarding flow
- [ ] **Phase 5: Account Management** - User profile and settings
- [ ] **Phase 6: Subscription & Billing** - Pricing, trials, payment integration
- [ ] **Phase 7: Usage Controls** - Limits, restrictions, metering

## Phase Details

### Phase 1: VDI FAQ Ingestion
**Goal**: Ingest VDI FAQ (https://vdi.lrv.lt/lt/dazniausiai-uzduodami-klausimai/) as a separate citable source in the knowledge base
**Depends on**: Nothing (first phase)
**Research**: Likely (external scraping)
**Research topics**: VDI website structure, scraping approach, content format, update strategy
**Plans**: TBD

### Phase 1.1: VDI Legal Docs (INSERTED)
**Goal**: Selective ingestion of VDI teisės aktai based on accountant relevance
**Depends on**: Phase 1
**Research**: Likely (LLM classification, selective scraping)
**Research topics**: Document classification criteria, LLM relevance scoring, Tier 1/2 prioritization
**Plans**: TBD

**Scope guidance from user:**
- Tier 1 (must-have): Employment contracts, working time/pay regs, VDU calculation, leave management
- Tier 2 (high-value): Occupational safety reporting, termination-related acts
- Use LLM to classify/score documents for relevance

### Phase 2: Contract Templates
**Goal**: Generate employment contract templates with user context
**Depends on**: Phase 1.1
**Research**: Unlikely (internal patterns, existing RAG)
**Plans**: TBD

### Phase 3: Landing Page
**Goal**: Create conversion-focused landing page explaining value proposition
**Depends on**: Nothing (can run parallel to early phases)
**Research**: Unlikely (standard frontend)
**Plans**: TBD

### Phase 4: User Onboarding
**Goal**: Registration flow, initial user setup, welcome experience
**Depends on**: Phase 3 (landing page drives signup)
**Research**: Unlikely (Firebase auth exists)
**Plans**: TBD

### Phase 5: Account Management
**Goal**: User profile, settings, preferences
**Depends on**: Phase 4
**Research**: Unlikely (internal patterns)
**Plans**: TBD

### Phase 6: Subscription & Billing
**Goal**: Pricing tiers, free trial, payment integration
**Depends on**: Phase 5
**Research**: Likely (external API)
**Research topics**: Payment provider (Stripe vs alternatives), Lithuanian market requirements, subscription management patterns
**Plans**: TBD

### Phase 7: Usage Controls
**Goal**: Usage limits, metering, enforcement
**Depends on**: Phase 6
**Research**: Unlikely (internal patterns)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 1.1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. VDI FAQ Ingestion | 1/3 | In progress | - |
| 1.1. VDI Legal Docs | 0/TBD | Not started | - |
| 2. Contract Templates | 0/TBD | Not started | - |
| 3. Landing Page | 0/TBD | Not started | - |
| 4. User Onboarding | 0/TBD | Not started | - |
| 5. Account Management | 0/TBD | Not started | - |
| 6. Subscription & Billing | 0/TBD | Not started | - |
| 7. Usage Controls | 0/TBD | Not started | - |
