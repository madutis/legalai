---
phase: 08-consultation-saving
plan: 05
subsystem: ui
tags: [switch, modal, settings, preferences, terms]

# Dependency graph
requires:
  - phase: 08-03
    provides: useSavePreference hook, ChatSidebar component
provides:
  - Save-by-default toggle in sidebar footer
  - Post-subscription save preference prompt
  - T&Cs section 7 for chat saving
  - Subscription modal benefits list with chat saving
affects: []

# Tech tracking
tech-stack:
  added: [@radix-ui/react-switch via shadcn]
  patterns: []

key-files:
  created:
    - src/components/chat/SavePreferencePrompt.tsx
    - src/components/ui/switch.tsx
  modified:
    - src/components/chat/ChatSidebar.tsx
    - src/app/chat/layout.tsx
    - src/app/chat/page.tsx
    - src/app/terms/page.tsx
    - src/components/subscription/SubscriptionModal.tsx
    - src/lib/firebase/firestore.ts
    - src/contexts/SubscriptionContext.tsx

key-decisions:
  - "Show save prompt after checkout success if saveByDefault undefined"
  - "Switch disabled for non-subscribers with explanation text"

patterns-established: []

# Metrics
duration: 5min
completed: 2026-01-30
---

# Phase 08 Plan 05: Settings UI & Copy Summary

**Save-by-default toggle in sidebar footer, post-subscription preference prompt, T&Cs section 7 for chat saving, and subscription modal benefits**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-30T12:19:40Z
- **Completed:** 2026-01-30T12:24:27Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Save preference toggle visible in sidebar footer for subscribers
- Non-subscribers see disabled toggle with "Tik prenumeratoriams" explanation
- Post-subscription prompt asks users to set save preference on first checkout
- T&Cs updated with new section 7 explaining chat saving policy
- Subscription modal now lists chat saving as a benefit

## Task Commits

Each task was committed atomically:

1. **Task 1: Add save preference toggle to sidebar** - `2a35187` (feat)
2. **Task 2: Create post-subscription save preference prompt** - `20140ca` (feat)
3. **Task 3: Update copy in T&Cs and upgrade modal** - `4045371` (feat)

## Files Created/Modified
- `src/components/ui/switch.tsx` - shadcn Switch component (new)
- `src/components/chat/SavePreferencePrompt.tsx` - Post-subscription preference modal (new)
- `src/components/chat/ChatSidebar.tsx` - Added toggle in footer with subscription check
- `src/app/chat/layout.tsx` - Wired up toggle and subscription context
- `src/app/chat/page.tsx` - Show save prompt after checkout success
- `src/lib/firebase/firestore.ts` - Added saveByDefault to UserDocument and helper functions
- `src/contexts/SubscriptionContext.tsx` - Parse saveByDefault field
- `src/app/terms/page.tsx` - Added section 7, renumbered 8-11
- `src/components/subscription/SubscriptionModal.tsx` - Added benefits list with chat saving

## Decisions Made
- Show save preference prompt only when saveByDefault is undefined (first subscription)
- Use short label "Saugoti" instead of "Saugoti pagal numatyma" for cleaner UI
- Benefits list in modal is compact 2-column grid

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Next Phase Readiness
- Phase 08 complete - all plans executed
- Consultation saving feature ready for production
- Pending: Deploy Firestore security rules

---
*Phase: 08-consultation-saving*
*Completed: 2026-01-30*
