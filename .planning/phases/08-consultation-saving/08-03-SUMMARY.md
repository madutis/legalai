---
phase: 08
plan: 03
subsystem: consultation-saving
tags: [firestore, debounce, hooks, sidebar, dialogs]
dependency-graph:
  requires: [08-01, 08-02]
  provides: [save-mechanism, consultation-hooks, save-prompt, delete-dialog]
  affects: [08-04, 08-05]
tech-stack:
  added: []
  patterns: [debounce-utility, message-sync-callback, save-prompt-flow]
key-files:
  created:
    - src/hooks/useSavePreference.ts
    - src/hooks/useConsultations.ts
    - src/lib/utils/debounce.ts
    - src/components/chat/SavePrompt.tsx
    - src/components/chat/DeleteConsultationDialog.tsx
  modified:
    - src/contexts/ConsultationContext.tsx
    - src/hooks/useChat.ts
    - src/components/chat/ConsultationList.tsx
    - src/components/chat/ChatSidebar.tsx
    - src/app/chat/layout.tsx
decisions:
  - "2s debounce for auto-save - balance between responsiveness and write efficiency"
  - "Sync messages via callback (onMessagesChange) - keeps useChat decoupled from ConsultationContext"
  - "Layout becomes client component - enables hooks for sidebar integration"
metrics:
  duration: 5min
  completed: 2026-01-30
---

# Phase 08 Plan 03: Save Mechanism Summary

Debounced auto-save with 2s delay, save prompt flow, consultation list wired to Firestore, delete dialog and per-chat dont_save control.

## What Was Built

### New Hooks
- **useSavePreference**: Reads/writes `saveByDefault` from user doc with onSnapshot listener
- **useConsultations**: Fetches consultation list metadata for sidebar

### Save Mechanism
- **debounce utility**: Simple debounce with cancel() for cleanup
- **ConsultationContext updates**:
  - Debounced Firestore write when savePreference='save'
  - startNewConsultation accepts optional savePreference param
  - setSavePreference persists immediately and saves messages if switching to 'save'

### useChat Integration
- **onMessagesChange callback**: Syncs messages to ConsultationContext
- **initialMessages prop**: Load messages from saved consultation
- **clearMessages reset**: Clears consultation state for new chat

### UI Components
- **SavePrompt**: Modal with save/don't-save/cancel for pending chats
- **DeleteConsultationDialog**: Confirm dialog with destructive styling
- **ConsultationList updates**: Added delete button with hover state
- **ChatSidebar updates**: Per-chat "Nesaugoti sios" button when saveByDefault is ON

### Layout Integration
- Chat layout now wraps with ConsultationProvider
- Manages sidebar state: consultations list, selection, delete, new
- Handles save prompt flow for pending chats

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| 2s debounce delay | Balance between responsiveness and Firestore write costs |
| Message sync via callback | Keeps useChat loosely coupled, can work without context |
| Client-side layout | Required for hooks; sidebar state needs client-side management |
| Delete button on hover | Keep UI clean, show action only when relevant |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 188e55d | feat | Add save preference and consultations hooks |
| 9620ef1 | feat | Wire save mechanism with 2s debounce |
| 048f04e | feat | Create SavePrompt and wire consultation list |
| 8168b0c | feat | Add delete and per-chat dont_save controls |

## Deviations from Plan

None - plan executed as written.

## Verification Status

- [x] TypeScript compiles without errors
- [x] Hooks created: useSavePreference, useConsultations
- [x] Debounce utility created
- [x] ConsultationContext has debounced save
- [x] useChat syncs messages via callback
- [x] SavePrompt created
- [x] DeleteConsultationDialog created
- [x] ConsultationList has delete button
- [x] ChatSidebar has per-chat dont_save button
- [x] Chat layout integrates everything

## Integration Points

**From 08-01:**
- Uses ConsultationDocument, ConsultationMessage, ConsultationMeta types
- Uses createConsultation, getConsultation, updateConsultation, deleteConsultation

**From 08-02:**
- Uses ChatSidebar, ConsultationList components
- Uses sidebar UI primitives

**For 08-04:**
- Title generation hook can use same pattern
- May need title update integration

**For 08-05:**
- Settings page can use useSavePreference hook

## Next Phase Readiness

- Consultation context fully functional with save/load/delete
- Save preference hook ready for settings UI
- Title generation already integrated (auto-added by linter during development)
