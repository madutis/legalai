# Phase 1: VDI FAQ Ingestion - Context

**Gathered:** 2026-01-20
**Status:** Ready for research

<vision>
## How This Should Work

VDI FAQ appears as a distinct, citable source in the knowledge base — alongside Labor Code, LAT rulings, and nutarimai. When the AI answers a question using VDI FAQ content, users clearly see "VDI FAQ" as the source.

This matters because VDI FAQ is authoritative yet accessible — it's the labor inspectorate answering the exact questions accountants ask, in plain Lithuanian. Users trust it because it's official guidance from the enforcement authority.

Citations follow the same pattern as existing sources for now. Future improvement noted: badge + link style for all source types.

</vision>

<essential>
## What Must Be Nailed

- **Content quality** — Accurate, complete ingestion of VDI FAQ content. The answers must be correctly extracted and indexed.
- **Source attribution** — Clear indication when VDI FAQ is the source (distinct from Labor Code, LAT, etc.)

</essential>

<specifics>
## Specific Ideas

- VDI FAQ URL: https://vdi.lrv.lt/lt/dazniausiai-uzduodami-klausimai/
- Source type: Separate from existing sources (not blended)
- Citation style: Match current Labor Code/LAT pattern
- Future consideration: badge + link format for all sources (refactor opportunity)

</specifics>

<notes>
## Additional Context

**Phase 1.1 identified:** VDI legal documents (teisės aktai) will be added as Phase 1.1 after this phase completes.

User provided detailed Tier 1/2 classification for which legal docs matter most:
- Tier 1 (must-have): Employment contracts, working time/pay regs, VDU calculation, leave management
- Tier 2 (high-value): Occupational safety reporting, termination-related acts

LLM classifier approach suggested for selective ingestion of legal docs — scope for Phase 1.1.

</notes>

---

*Phase: 01-vdi-faq-ingestion*
*Context gathered: 2026-01-20*
