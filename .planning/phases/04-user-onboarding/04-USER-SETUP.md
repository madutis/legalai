# Phase 04: User Setup Required

**Generated:** 2026-01-27
**Phase:** 04-user-onboarding
**Status:** Incomplete

## Why This Setup Is Required

Authentication requires Firebase project configuration. The code is ready but will fail without these credentials.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console -> Project Settings -> General -> Web app -> apiKey | `.env.local` |
| [ ] | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Console -> Project Settings -> General -> Web app -> authDomain | `.env.local` |
| [ ] | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console -> Project Settings -> General -> Web app -> projectId | `.env.local` |

## Dashboard Configuration

- [ ] **Enable Google sign-in provider**
  - Location: Firebase Console -> Authentication -> Sign-in method -> Google -> Enable
  - Details: Select project support email

- [ ] **Enable Email link (passwordless) sign-in**
  - Location: Firebase Console -> Authentication -> Sign-in method -> Email/Password -> Enable Email link (passwordless sign-in)

- [ ] **Add authorized domains for magic links**
  - Location: Firebase Console -> Authentication -> Settings -> Authorized domains
  - Details: Add `localhost` and your production domain

## Verification

After setup, verify with:

```bash
# Start dev server
npm run dev

# Visit http://localhost:3000/sign-in
# - Google button should open popup (will fail if not configured)
# - Magic link should send email (will fail if not configured)
```

Expected behavior:
- Google sign-in opens OAuth popup
- Magic link sends email with sign-in link
- After sign-in, user redirects to onboarding or chat

---
**Once all items complete:** Mark status as "Complete"
