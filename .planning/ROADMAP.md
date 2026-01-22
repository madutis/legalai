# Roadmap: LegalAI

## Overview

Transform the existing LegalAI POC into a commercial product for Lithuanian accountants. Starting with VDI FAQ integration (immediate priority), then building out document generation, user acquisition (landing page, onboarding), and monetization (subscriptions, billing, usage controls).

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: VDI FAQ Ingestion** - Add VDI FAQ as citable knowledge source
- [x] **Phase 1.1: VDI Legal Docs** - Selective ingestion of VDI teisės aktai (INSERTED)
- [x] **Phase 1.2: Darbo Sauga** - Occupational safety guidance ingestion + topic (INSERTED)
- [x] **Phase 1.3: Fire Safety Law** - Priešgaisrinės saugos įstatymas ingestion (INSERTED)
- [x] **Phase 1.4: Labor Disputes Statistics** - VDI DGK outcome statistics for evidence-based guidance (INSERTED)
- [ ] **Phase 2: Contract Templates** - Employment contract template generation
- [ ] **Phase 2.1: Safety Rules Generator** - Darbo saugos taisyklės generator (INSERTED)
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

### Phase 1.2: Darbo Sauga (INSERTED)
**Goal**: Ingest VDI occupational safety methodological recommendations and add "Darbo sauga" topic
**Depends on**: Phase 1.1
**Research**: Unlikely (follows VDI docs pattern)
**Plans**: 3 estimated

**Scope:**
- Crawl VDI MR_grid.aspx for methodological recommendations (245 total docs)
- Filter to Tier 1+2 relevant for accountants (~10-15 docs)
- Key docs: instruktavimas, nuotolinis darbas, smurto prevencija, nelaimingi atsitikimai
- Add "Darbo sauga" topic to landing page and chat
- Update search and LLM prompts for DSS citations

**PRD:** .planning/phases/01.2-darbo-sauga/PRD.md

### Phase 1.3: Fire Safety Law (INSERTED)
**Goal**: Ingest Priešgaisrinės saugos įstatymas (22 articles) as citable legislation source
**Depends on**: Phase 1.2
**Research**: Unlikely (follows DSS ingestion pattern)
**Plans**: 1 estimated

**Scope:**
- Ingest Fire Safety Law from e-tar.lt (TAR.9CBB77180BFE)
- lawCode: PSS
- Add to search and LLM context labeling
- Add to source display with e-tar links

**Key Articles:**
- Art 10-11: Citizen/organization rights and duties
- Art 12-15: Fire prevention requirements
- Art 16-18: Fire suppression organization

### Phase 1.4: Labor Disputes Statistics (INSERTED)
**Goal**: Add VDI labor dispute outcome statistics to LLM context for evidence-based guidance
**Depends on**: Phase 1.3
**Research**: Unlikely (data already downloaded)
**Plans**: 1 estimated

**Data source:** data.gov.lt VDI "Darbo ginčų duomenys" (2013-2025, 86k cases)
**Location:** /data/open-data/16_dg_*.csv

**Scope:**
- Aggregate all 13 CSVs into processed statistics JSON
- Compute outcome rates by claim type (REIKG → DGSP_PAV)
- Compute stats by industry (top 15 EVRK codes)
- Compute avg/median amounts by claim type
- Add `<darbo_ginčų_statistika>` block to system prompt
- Teach LLM to cite "VDI DGK duomenys (2013-2025)"

**Key statistics to include:**
- Outcome distribution: tenkinama pilnai/dalies, atmesta, taikos sutartis
- Top claim types: darbo užmokestis (70%), atleidimas, žala
- Industry patterns: transportas, statyba, restoranai
- Financial: avg/median amounts awarded

**Not in scope:**
- Individual case search/RAG
- Real-time data updates
- Case-level citations

### Phase 2: Contract Templates
**Goal**: Generate employment contract templates with user context
**Depends on**: Phase 1.2
**Research**: Unlikely (internal patterns, existing RAG)
**Plans**: TBD

### Phase 2.1: Safety Rules Generator (INSERTED)
**Goal**: Generate customized Darbo saugos taisyklės based on company profile
**Depends on**: Phase 1.2 (DSS content), Phase 2 (template generation patterns)
**Research**: Unlikely (builds on Phase 2 patterns)
**Plans**: 3-4 estimated

**Features:**
- Company profile input: size, industry (EVRK), work types, hazards
- RAG-powered clause generation from DSS įstatymas + VDI rekomendacijos
- Conditional sections based on hazards (PPE, VDU work, heights, etc.)
- Standard template structure with customizable content

**Template sections:**
1. Bendrosios nuostatos
2. Darbdavio pareigos (from DSS įstatymas)
3. Darbuotojo teisės ir pareigos
4. Instruktavimo tvarka (from VDI rekomendacijos)
5. Darbo vietos reikalavimai
6. Asmeninės apsaugos priemonės (conditional)
7. Nelaimingų atsitikimų tyrimas
8. Atsakomybė

**PRD:** To be created (extends Phase 1.2 PRD concept)

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
Phases execute in numeric order: 1 → 1.1 → 1.2 → 1.3 → 1.4 → 2 → 2.1 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. VDI FAQ Ingestion | 3/3 | ✓ Complete | 2026-01-20 |
| 1.1. VDI Legal Docs | 2/2 | ✓ Complete | 2026-01-20 |
| 1.2. Darbo Sauga | 3/3 | ✓ Complete | 2026-01-21 |
| 1.3. Fire Safety Law | 1/1 | ✓ Complete | 2026-01-21 |
| 1.4. Labor Disputes Statistics | 1/1 | ✓ Complete | 2026-01-22 |
| 2. Contract Templates | 0/TBD | Not started | - |
| 2.1. Safety Rules Generator | 0/3-4 | Not started | - |
| 3. Landing Page | 0/TBD | Not started | - |
| 4. User Onboarding | 0/TBD | Not started | - |
| 5. Account Management | 0/TBD | Not started | - |
| 6. Subscription & Billing | 0/TBD | Not started | - |
| 7. Usage Controls | 0/TBD | Not started | - |
