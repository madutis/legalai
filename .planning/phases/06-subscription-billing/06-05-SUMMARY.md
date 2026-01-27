---
phase: 06-subscription-billing
plan: 05
subsystem: billing
tags: [firestore, usage-tracking, rate-limiting, toast, modal]
requires: ["06-04"]
provides: [fair-use-limits, daily-usage-tracking, usage-warning-toast, limit-reached-modal]
affects: []
tech-stack:
  added: []
  patterns: [fire-and-forget, stream-event-types, server-side-usage-check]
key-files:
  created: [src/components/subscription/UsageWarning.tsx, src/components/subscription/UsageLimitModal.tsx]
  modified: [src/lib/firebase/firestore.ts, src/lib/firebase/admin.ts, src/app/api/chat/route.ts, src/hooks/useChat.ts, src/components/chat/ChatInterface.tsx]
key-decisions:
  - UTC date key for usage tracking (YYYY-MM-DD) for consistency across timezones
  - Increment usage at start of stream processing (fire and forget)
  - Send usage info early in stream as separate event type
  - Warning shown at 45+ questions (5 or fewer remaining)
duration: 4 min
completed: 2026-01-27
---

# Phase 6 Plan 05: Fair Use Limits Summary

50 questions/day limit with soft warning at 5 remaining and hard block at 50.

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-27T21:14:58Z
- **Completed:** 2026-01-27T21:18:56Z
- **Tasks completed:** 3/3
- **Files modified:** 7

## What Was Built

### Task 1: Usage Tracking Functions (Firestore)

Added to `src/lib/firebase/firestore.ts`:
- `getTodayUsage(uid)` - Get today's question count for a user
- `incrementUsage(uid)` - Increment count atomically with serverTimestamp
- `checkUsageLimit(uid)` - Check if user can send message, returns allowed/remaining/showWarning

Uses UTC date key (YYYY-MM-DD) for consistency.

### Task 2: Chat API Usage Enforcement

Updated `src/app/api/chat/route.ts`:
- Checks Authorization header for authenticated users
- Calls `checkUsageLimitAdmin()` before processing
- Returns 429 with `error: 'limit_reached'` when at 50 questions
- Sends usage info in stream as `type: 'usage'` event
- Increments usage at start of processing (fire and forget)

Added server-side functions to `src/lib/firebase/admin.ts`:
- `checkUsageLimitAdmin(uid)` - Server-side usage check
- `incrementUsageAdmin(uid)` - Server-side atomic increment

### Task 3: Usage Warning and Limit Components

Created new components:
- `UsageWarning.tsx` - Amber toast shown when 5 or fewer questions remaining, auto-dismisses in 5 seconds
- `UsageLimitModal.tsx` - Modal shown when 50 questions reached, informational with single "Supratau" button

Updated `useChat` hook:
- Handles `type: 'usage'` stream event
- Handles 429 `limit_reached` response
- Returns `usageInfo`, `limitReached`, `dismissLimitReached`, `dismissUsageWarning`

Updated `ChatInterface.tsx`:
- Integrates UsageWarning toast and UsageLimitModal
- Shows warning when `showWarning && remaining <= 5`
- Shows modal when `limitReached` is true

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 176be5c | feat(06-05): add usage tracking functions to Firestore |
| 2 | ab61501 | feat(06-05): add usage check to chat API |
| 3 | a5b8d25 | feat(06-05): create usage warning and limit components |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| UTC date key (YYYY-MM-DD) | Consistent across timezones, aligns with "midnight UTC" reset |
| Fire-and-forget increment | Non-blocking UX - usage tracking shouldn't delay response |
| Stream event for usage | Client gets info early, can show warning immediately |
| Warning at 45+ questions | Gives users 5-question buffer to finish conversation |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `npm run build` succeeds without errors
- [x] Usage tracked in Firestore subcollection users/{uid}/usage/{YYYY-MM-DD}
- [x] Chat API returns 429 at limit with `error: 'limit_reached'`
- [x] Warning toast appears at 45+ questions (5 or fewer remaining)
- [x] Limit modal appears at 50 questions

## Next Step

Phase 6 complete. All 5 plans finished.
Ready for phase transition or verification with `/gsd:verify-work 6`.
