# Phase 5: Account Management - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<vision>
## How This Should Work

Minimal account page at `/account` — just email display and sign out for now. The profile will be expanded when billing is implemented.

The key behavior change: profiling answers (role, company size, topic) should persist and automatically seed new chat conversations. Currently stored in localStorage, but needs to carry across sessions/devices.

User sees value before signing up (from Phase 4), then their preferences follow them.

</vision>

<essential>
## What Must Be Nailed

- **New chats inherit user context** — When starting a fresh conversation, the user's company profile and preferences are pre-loaded so the AI already knows their context
- **Minimal visible profile** — Just email + sign out on /account page. Don't over-build until billing phase needs it.

</essential>

<specifics>
## Specific Ideas

- Dedicated `/account` page (not header dropdown)
- Store profiling in Firestore under user doc (not localStorage)
- On new chat: load user's stored context instead of asking again
- Keep profile UI minimal — billing phase will extend it

</specifics>

<notes>
## Additional Context

Current flow: profiling → localStorage → chat. New flow should be: profiling → Firestore → any new chat session.

Phase 6 (Subscription & Billing) will need to extend the account page with subscription status, so building /account as a page (vs dropdown) makes future extension easier.

</notes>

---

*Phase: 05-account-management*
*Context gathered: 2026-01-27*
