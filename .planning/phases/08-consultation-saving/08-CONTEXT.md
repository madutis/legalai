# Phase 8: Consultation Saving - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow paid subscribers to save and view chat history with configurable defaults. Non-subscribers cannot save chats. Includes: saving mechanism, history viewing, default preference toggle, and related copy updates across the app.

</domain>

<decisions>
## Implementation Decisions

### Saving triggers
- Auto-save continuously when "save by default" is ON
- When OFF: prompt at end of chat (on new chat click OR leaving page)
- Per-chat override available both directions:
  - Can save individual chat when global default is OFF
  - Can mark chat as "don't save" when global default is ON (private consultation)

### Chat history UI
- Collapsible sidebar in chat view showing past chats
- Chronological list, newest first
- Each entry shows LLM-generated title (summary)
- Clicking opens chat in same view (replaces current chat)
- Claude's discretion: whether opened chats are read-only or continuable

### Privacy & messaging
- Update copy: "we don't save chats" → "saved only if you choose"
- Messaging locations: account settings toggle area + T&Cs page
- Upgrade prompts: include chat saving as benefit (minimal mention, not highlighted)
- Chat deletion: simple confirm dialog ("Delete this chat?")

### Default settings flow
- Post-subscription prompt immediately after first payment
- Default value ON (convenience-first) before user explicitly chooses
- Settings toggle lives in chat sidebar for quick access
- Per-chat override: prompt at end if default OFF, toggle in sidebar if default ON

### Claude's Discretion
- Exact sidebar collapse/expand UX
- LLM prompt for title generation
- Whether viewing saved chat allows continuation or is read-only
- Post-subscription prompt styling and copy
- Data model specifics (messages array structure, metadata fields)

</decisions>

<specifics>
## Specific Ideas

- "One private consultation" use case: even with saving ON, user should be able to mark individual chat as not saved
- Sidebar should feel lightweight, not dominate the chat interface
- Title generation should be quick (async, can show placeholder initially)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-consultation-saving*
*Context gathered: 2026-01-30*
