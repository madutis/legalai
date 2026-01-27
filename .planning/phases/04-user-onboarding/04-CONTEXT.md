# Phase 4: User Onboarding - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<vision>
## How This Should Work

Quick gate — minimal friction to get users into the chat. No lengthy signup forms or guided wizards. User hits the app, sees a clean sign-in page, authenticates with one click, and they're in.

Auth methods:
- Google OAuth (primary)
- Magic link (passwordless email)
- Microsoft OAuth (can come later)

No traditional email/password forms. Modern, fast, one-click where possible.

</vision>

<essential>
## What Must Be Nailed

- **Auth blocks chat** — No anonymous access. User must be signed in to use the app.
- **Smooth sign-in UX** — One-click flow, no friction, feels instant. Get out of the user's way.

</essential>

<specifics>
## Specific Ideas

- Minimal centered design — clean card with just the auth buttons
- No split-screen marketing, no elaborate branding page
- Just the essentials: logo, auth buttons, done

</specifics>

<notes>
## Additional Context

Firebase auth already exists in the codebase (basic). This phase gates the existing chat functionality behind proper authentication.

Priority order for auth methods:
1. Google OAuth (most common for business users)
2. Magic link (fallback for those who prefer email)
3. Microsoft OAuth (later phase, nice-to-have for enterprise)

</notes>

---

*Phase: 04-user-onboarding*
*Context gathered: 2026-01-27*
