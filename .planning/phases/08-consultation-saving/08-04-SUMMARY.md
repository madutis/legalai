---
phase: 08-consultation-saving
plan: 04
subsystem: chat, api
tags: [gemini, title-generation, message-conversion, consultation-loading]

# Dependency graph
requires:
  - phase: 08-01
    provides: ConsultationContext, Firestore CRUD functions
  - phase: 08-02
    provides: Sidebar UI scaffolding
provides:
  - LLM title generation for consultations via Gemini Flash
  - Message format converter utility (ChatMessage <-> ConsultationMessage)
  - Auto-title generation after first user+assistant exchange
  - Load and continue saved consultations
affects: [08-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use ref to prevent duplicate async operations"
    - "Memoize derived state to prevent infinite re-renders"
    - "Graceful fallback for LLM operations"

key-files:
  created:
    - src/lib/gemini/title.ts
    - src/lib/utils/messageConverter.ts
  modified:
    - src/contexts/ConsultationContext.tsx
    - src/components/chat/ChatInterface.tsx

key-decisions:
  - "Gemini 2.0 Flash for title generation (fast, cost-effective)"
  - "Title max 6 words in Lithuanian"
  - "Ref-based deduplication for title generation"
  - "Memoize initialMessages by consultationId only"

patterns-established:
  - "Use titleGenerationAttemptedRef to prevent duplicate LLM calls"
  - "toChatMessages/toConsultationMessages for format conversion"

# Metrics
duration: 3min
completed: 2026-01-30
---

# Phase 08 Plan 04: Title Generation and Consultation Loading Summary

**LLM-generated Lithuanian titles via Gemini Flash, with working load/continue flow for saved consultations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-30T12:12:37Z
- **Completed:** 2026-01-30T12:15:43Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments

- Title generation function using Gemini 2.0 Flash with Lithuanian prompt
- Clean message format conversion utility (single source of truth)
- Auto-generate title after first user+assistant exchange
- ChatInterface loads saved consultations and allows continuation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create title generation function** - `62b62bb` (feat)
2. **Task 2: Create message format conversion utility** - `79e54e3` (feat)
3. **Task 3: Trigger title generation after first exchange** - `7348d0c` (feat)
4. **Task 4: Enable loading and continuing saved consultations** - `cf5587c` (feat)

## Files Created/Modified

- `src/lib/gemini/title.ts` - generateConsultationTitle function using Gemini Flash
- `src/lib/utils/messageConverter.ts` - toChatMessage, toConsultationMessage, batch converters
- `src/contexts/ConsultationContext.tsx` - Added title generation effect with ref deduplication
- `src/components/chat/ChatInterface.tsx` - Integrated with ConsultationContext for load/continue

## Decisions Made

- Used Gemini 2.0 Flash (not 2.5 Flash) for title generation - faster and cost-effective for simple task
- Title prompt: max 6 words, Lithuanian, no quotes
- Graceful fallback to "Konsultacija" if LLM fails
- Memoize initialMessages by consultationId to prevent re-renders when consultation object changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Title generation ready for production use
- Load/continue flow functional
- Ready for 08-05: Save prompt UI and user choice handling

---
*Phase: 08-consultation-saving*
*Completed: 2026-01-30*
