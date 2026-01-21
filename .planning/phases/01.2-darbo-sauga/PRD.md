# Phase 1.2: Darbo Sauga (Occupational Safety) - PRD

**Created:** 2026-01-21
**Updated:** 2026-01-21
**Status:** Ready for planning

---

## Problem Statement

Our knowledge base has **minimal occupational safety coverage**. Current VDI documents (99 chunks) focus on employment contracts, wages, and termination - with only tangential safety mentions. Accountants handling employment administration need guidance on:

- Workplace incident reporting requirements
- Employee instruction/training obligations
- Remote work safety compliance
- Basic DSS (darbuotojų sauga ir sveikata) requirements
- Internal safety rules (darbo saugos taisyklės) requirements

This is a gap in our product offering and a missed opportunity for differentiation.

---

## Goals

1. **Ingest occupational safety legislation** - DSS įstatymas as foundational reference
2. **Ingest occupational safety guidance** - VDI methodological recommendations
3. **Add "Darbo sauga" topic** to landing page and chat flow
4. **Enable safety-related Q&A** with proper source citations
5. **Lay foundation for taisyklės generator** (Phase 2.1)

---

## Available Sources

### 1. DSS Įstatymas (Occupational Safety Act)
**Source:** https://www.e-tar.lt/portal/lt/legalAct/TAR.E400C8BB686C/asr
**Type:** Primary legislation
**Relevance:** ⭐⭐⭐ Foundational - defines employer/employee duties, required documentation, penalties

Key sections for accountants:
- Darbdavio pareigos (employer duties)
- Darbuotojo teisės ir pareigos (employee rights & duties)
- Instruktavimo reikalavimai (training requirements)
- Dokumentų reikalavimai (documentation requirements)
- DSS tarnybos steigimas (safety service establishment)
- Atsakomybė (liability)

### 2. VDI Methodological Recommendations
**URL:** https://www.vdi.lt/Forms/MR_grid.aspx
**Total:** 245 documents (PDFs)
**Format:** PDF downloads from vdi.lt/AtmUploads/

#### High-Priority Documents (Tier 1)

| Document | URL | Relevance |
|----------|-----|-----------|
| Darbuotojų instruktavimo tvarka | /AtmUploads/InstruktavimoTvarkosNustatymasUS.pdf | Training requirements |
| Nuotolinio darbo sauga | /AtmUploads/Nuotolinisdarbas.pdf | Remote work DSS |
| Psichologinio smurto prevencija | /AtmUploads/Smurtas.pdf | Mandatory since 2022 |
| Kaip ištirti nelaimingą atsitikimą | /AtmUploads/NA_2025_09_03.pdf | Incident investigation |
| Atmintinė tiriant įvykius darbe | /AtmUploads/naatmintinetiriantlengvus1.pdf | Light injury reporting |
| Karščio poveikis darbe | /AtmUploads/heat.pdf | Heat safety guidance |

#### Medium-Priority Documents (Tier 2)

| Document | URL | Relevance |
|----------|-----|-----------|
| Skaitmeninių platformų sauga | /AtmUploads/skatmenine_platforma.pdf | Gig economy workers |
| Vidaus eismo organizavimas | /AtmUploads/Vidaus_eismas.pdf | Workplace traffic |
| Komandiruoti statybų darbuotojai | /AtmUploads/komandiruoti_statybos.pdf | Posted workers |

### 3. General PPE Requirements (Tier 2)
**Source:** Social Ministry / e-tar.lt
**Content:** Asmeninių apsaugos priemonių naudojimo taisyklės
**Relevance:** Template generation - which PPE required by work type

### Sources NOT Included (Tier 3 - skip)

- Hazard-specific technical regulations (noise dB limits, chemical exposure limits)
- VDI Legal Acts Registry (706 acts - too much noise)
- Industry-specific detailed requirements (asbestos, construction heights)
- Equipment-specific safety standards
- 2022-2027 strategic action plan

---

## Scope

### In Scope

1. **DSS Įstatymas ingestion**
   - Fetch from e-tar.lt (similar to Darbo Kodeksas pattern)
   - Parse articles with structure preservation
   - Chunk and embed for vector search
   - Add as `dss_istatymas` docType or extend `legislation`

2. **VDI safety documents ingestion**
   - Crawl VDI MR_grid.aspx for document list
   - Download and extract text from Tier 1 + Tier 2 PDFs
   - Chunk and embed for vector search
   - Add as `vdi_safety` docType (or extend `vdi_doc` with category)

3. **Topic addition**
   - Add "Darbo sauga" to TOPICS in landing page
   - Add to TOPIC_LABELS, TOPIC_ICONS in chat page
   - Add to ConsultationTopic type
   - Add to topics.ts config with follow-up questions

4. **Search integration**
   - Add search parameters for safety sources
   - Set score threshold 0.60 (match other VDI sources)
   - Update LLM prompt with DSS citation instructions

5. **UI updates**
   - Display "DSS Įstatymas" / "VDI DSS" in source chips
   - Link to source documents

### Out of Scope (this phase)

- Industry-specific safety regulations
- Full 245-document ingestion (only Tier 1+2)
- Safety training/certification tracking features
- Incident reporting form generation
- Integration with data.gov.lt datasets
- **Darbo saugos taisyklės generator** (→ Phase 2.1)

---

## Technical Approach

### 1. DSS Įstatymas Ingestion

Similar to Darbo Kodeksas ingestion:
- Fetch from e-tar.lt API or scrape HTML
- Parse article structure (straipsniai, dalys, punktai)
- Preserve article numbers for citation
- Embed with metadata:
  ```json
  {
    "docType": "legislation",
    "lawCode": "DSS",
    "articleNumber": "12",
    "articleTitle": "Darbdavio pareigos"
  }
  ```

### 2. VDI Safety Docs Discovery & Ingestion

**Discovery script:**
- Fetch paginated list from MR_grid.aspx (25 pages)
- Parse: title, date, category, PDF URL
- Filter to Tier 1+2 using keywords:
  - Tier 1: instruktav*, nuotolin*, smurt*, nelaiming*, atsitik*
  - Tier 2: platform*, eismas, komandir*
- Output manifest: `data/vdi-safety-manifest.json`

**Ingestion script:**
- Download PDFs from vdi.lt/AtmUploads/
- Extract text using unpdf
- Chunk at 1500 chars with 200 char overlap
- Embed and upsert to Pinecone

### 3. Search Updates

In `src/lib/pinecone/index.ts`:
```typescript
// New parameters
dssK: 3,           // DSS įstatymas articles
vdiSafetyK: 3,     // VDI safety recommendations

// Score thresholds
dss: 0.65,         // Match legislation threshold
vdi_safety: 0.60   // Match VDI threshold
```

### 4. Topic Updates

Files to modify:
- `src/app/page.tsx` - Add Darbo sauga to TOPICS, TOPIC_ICONS
- `src/app/chat/page.tsx` - Add to TOPIC_LABELS, TOPIC_ICONS
- `src/lib/topics.ts` - Add topic config with questions
- `src/types/index.ts` - Add to ConsultationTopic union

```typescript
{
  id: 'safety',
  labelLT: 'Darbo sauga',
  labelEN: 'Occupational Safety',
  questions: [
    {
      id: 'safety_type',
      textLT: 'Koks darbo saugos klausimas?',
      options: [
        { value: 'training', labelLT: 'Instruktavimas/mokymai' },
        { value: 'incident', labelLT: 'Nelaimingas atsitikimas' },
        { value: 'remote', labelLT: 'Nuotolinis darbas' },
        { value: 'rules', labelLT: 'Taisyklės/dokumentai' },
        { value: 'general', labelLT: 'Bendri reikalavimai' },
      ],
    },
  ],
}
```

### 5. LLM Prompt Updates

Add to system prompt:
```
- Šaltiniai gali būti pažymėti [DSS ĮSTATYMAS, X straipsnis] arba [VDI DSS REKOMENDACIJOS]
- Jei šaltiniuose yra DSS įstatymo straipsnių - cituok su straipsnio numeriu
- Jei tarp šaltinių yra VDI DSS dokumentų - cituok: "Pagal VDI metodines rekomendacijas..."
```

---

## Success Criteria

1. **DSS Įstatymas ingested**
   - [ ] All articles parsed and embedded
   - [ ] Citations work: "DSS įstatymo 12 str."

2. **VDI safety docs ingested**
   - [ ] 10+ safety documents ingested as vectors
   - [ ] Tier 1 docs (instruktavimas, nuotolinis darbas, smurtas) included

3. **Topic functional**
   - [ ] "Darbo sauga" appears in landing page topic selection
   - [ ] Topic label displays correctly in chat header
   - [ ] PDF export shows correct topic name

4. **Search works**
   - [ ] Query "darbdavio pareigos saugai" returns DSS įstatymas articles
   - [ ] Query "kaip instruktuoti darbuotojus" returns VDI DSS docs
   - [ ] Query "nuotolinio darbo sauga" returns remote work guidance

5. **Citations accurate**
   - [ ] LLM cites DSS įstatymas with article numbers
   - [ ] LLM cites VDI safety documents
   - [ ] Source links work correctly

---

## Estimated Effort

| Component | Estimate |
|-----------|----------|
| DSS Įstatymas ingestion | 1 plan |
| VDI safety discovery + ingestion | 1 plan |
| Topic + search + UI integration | 1 plan |
| Testing + verification | Part of each plan |

**Total: 3 plans**

---

## Dependencies

- Phase 1 (VDI FAQ) - Complete
- Phase 1.1 (VDI Legal Docs) - Complete
- Existing ingestion patterns established
- Darbo Kodeksas ingestion pattern (for DSS įstatymas)

---

## Risks

| Risk | Mitigation |
|------|------------|
| DSS įstatymas structure differs from DK | Inspect first, adapt parser |
| PDF extraction quality varies | Use unpdf, skip malformed docs |
| MR_grid pagination changes | Build resilient scraper with fallback |
| Too many documents overwhelm search | Start with Tier 1 only, expand if needed |

---

## Open Questions - RESOLVED

1. **Separate docType for safety?**
   - Decision: Use `vdi_doc` with `category: 'safety'` metadata
   - DSS įstatymas uses `legislation` with `lawCode: 'DSS'`

2. **Topic icon?**
   - Decision: Shield icon (matches protection/safety theme)

3. **Search weight?**
   - Decision: Same thresholds, let relevance scoring handle priority

---

## Future: Phase 2.1 - Darbo Saugos Taisyklės Generator

This phase lays the foundation for a **Darbo saugos taisyklės generator** feature:

### Concept
Generate customized internal safety rules document based on company profile:
- Company size (< 50 vs 50+ employees)
- Industry / EVRK code
- Work types (office, warehouse, manufacturing, remote)
- Specific hazards (VDU work, heights, machinery, chemicals)

### Template Structure (standard sections)
1. Bendrosios nuostatos (general provisions)
2. Darbdavio pareigos (employer duties) - from DSS įstatymas
3. Darbuotojo teisės ir pareigos (employee rights & duties)
4. Instruktavimo tvarka (training procedures) - from VDI rekomendacijos
5. Darbo vietos reikalavimai (workplace requirements)
6. Asmeninės apsaugos priemonės (PPE) - conditional by hazard
7. Nelaimingų atsitikimų tyrimas (incident investigation)
8. Atsakomybė (liability)

### Why This Phase Enables It
- DSS įstatymas provides legal framework and required elements
- VDI rekomendacijos provide best practices and VDI expectations
- Topic infrastructure allows safety-specific flows
- Search enables RAG-powered clause generation

### Estimated Scope
- Separate phase after Contract Templates
- 3-4 plans estimated
- Similar UX to contract generation flow

---

## References

- DSS Įstatymas: https://www.e-tar.lt/portal/lt/legalAct/TAR.E400C8BB686C/asr
- Social Ministry DSS page: https://socmin.lrv.lt/lt/veiklos-sritys/darbo-rinka-uzimtumas/darbuotoju-sauga-ir-sveikata/teises-aktai-2/
- VDI Methodological Recommendations: https://www.vdi.lt/Forms/MR_grid.aspx
- VDI Safety Section: https://vdi.lrv.lt/lt/darbuotoju-sauga-ir-sveikata/
- Existing ingestion: scripts/ingest-vdi-docs.ts
- Existing discovery: scripts/discover-vdi-content.ts

---

*Phase: 01.2-darbo-sauga*
*PRD created: 2026-01-21*
*PRD updated: 2026-01-21 - Added DSS įstatymas, taisyklės generator concept*
