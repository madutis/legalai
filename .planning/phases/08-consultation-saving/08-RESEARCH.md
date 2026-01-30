# Phase 8: Consultation Saving - Research

**Researched:** 2026-01-30
**Domain:** Firestore chat persistence, real-time sync, sidebar UI patterns
**Confidence:** HIGH

## Summary

This phase implements chat history saving for paid subscribers using Firestore subcollections, a collapsible sidebar for history viewing, and LLM-generated titles. The existing codebase already uses Firestore for user profiles and subscription data with `onSnapshot` for real-time updates, so extending this pattern for chat history is natural and well-tested.

Research confirms the standard approach for chat applications in Firestore:
1. Store chats as documents in a `users/{uid}/consultations` subcollection
2. Store messages as an array within each consultation document (suitable for <1K messages per chat)
3. Use `onSnapshot` for real-time sync when viewing saved chats
4. Use shadcn/ui Sidebar component for the collapsible history panel
5. Generate titles via Gemini Flash with a simple, direct prompt

**Primary recommendation:** Use Firestore subcollections for chat storage with per-chat documents containing message arrays, shadcn/ui Sidebar for history UI, and async Gemini Flash calls for title generation.

## Standard Stack

The existing stack fully supports this phase - no new dependencies needed.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase | ^12.8.0 | Client-side Firestore access | Already used for user/subscription data |
| firebase-admin | ^13.6.0 | Server-side Firestore (API routes) | Already used for auth verification |
| @google/generative-ai | ^0.24.1 | Gemini API for title generation | Already used for RAG responses |
| lucide-react | ^0.563.0 | Icons for sidebar | Already in project |
| @radix-ui/react-* | various | Primitives for UI components | Already used throughout |

### Supporting (Need to Add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-collapsible | latest | Collapsible primitive for sidebar sections | For expandable menu groups |

Note: shadcn/ui Sidebar is a copy-paste component, not an npm package. Add via `npx shadcn@latest add sidebar`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Messages as array | Messages as subcollection | Subcollection better for >1K messages, but requires more reads. Array simpler for typical consultation length (~20-50 messages) |
| Gemini Flash | Claude Haiku | Claude may produce slightly better titles but adds another API dependency |
| shadcn Sidebar | Custom sidebar | Custom is more work, shadcn provides tested patterns |

**Installation:**
```bash
npx shadcn@latest add sidebar collapsible sheet
npm install @radix-ui/react-collapsible
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── firebase/
│       └── consultations.ts     # Firestore CRUD for consultations
├── hooks/
│   ├── useChat.ts               # (existing) Extend with save/load
│   ├── useConsultations.ts      # Fetch consultation list
│   └── useSavePreference.ts     # Save-by-default toggle
├── components/
│   └── chat/
│       ├── ChatSidebar.tsx      # Collapsible history sidebar
│       ├── ConsultationList.tsx # List of past consultations
│       └── SavePrompt.tsx       # End-of-chat save prompt
└── contexts/
    └── ConsultationContext.tsx  # Current consultation state
```

### Pattern 1: Firestore Subcollection Structure
**What:** Store consultations as documents under `users/{uid}/consultations/{consultationId}`
**When to use:** Always for user-scoped data
**Example:**
```typescript
// Source: Firebase official docs + existing codebase pattern
interface ConsultationDocument {
  id: string;                    // Auto-generated
  title: string;                 // LLM-generated, max 60 chars
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'active' | 'completed';
  savePreference: 'save' | 'dont_save' | 'pending';
  context: {
    userRole: string;
    companySize: string;
    topic: string;
  };
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: ChatSource[];
    timestamp: Timestamp;
  }>;
}
```

### Pattern 2: Real-time Listener for Current Consultation
**What:** Use `onSnapshot` for the active consultation, `getDocs` for list
**When to use:** Active chat needs real-time; history list can be static
**Example:**
```typescript
// Source: Existing SubscriptionContext.tsx pattern
useEffect(() => {
  if (!consultationId) return;

  const consultationRef = doc(db, 'users', uid, 'consultations', consultationId);
  const unsubscribe = onSnapshot(consultationRef, (snapshot) => {
    if (snapshot.exists()) {
      setConsultation(parseConsultationDoc(snapshot.data()));
    }
  });

  return () => unsubscribe();
}, [uid, consultationId]);
```

### Pattern 3: Auto-save with Debounce
**What:** Save messages with debounce to avoid excessive writes
**When to use:** When savePreference is 'save' (auto-save ON)
**Example:**
```typescript
// Save after 2 seconds of no new messages
const debouncedSave = useMemo(
  () => debounce((messages: Message[]) => {
    if (savePreference === 'save') {
      updateConsultation(consultationId, { messages, updatedAt: new Date() });
    }
  }, 2000),
  [consultationId, savePreference]
);

useEffect(() => {
  if (messages.length > 0) {
    debouncedSave(messages);
  }
}, [messages, debouncedSave]);
```

### Pattern 4: Title Generation
**What:** Generate title from first user message + first assistant response
**When to use:** After first complete exchange in a consultation
**Example:**
```typescript
// Source: Prompt engineering best practices
const TITLE_PROMPT = `Generate a title for this legal consultation in Lithuanian.
Requirements:
- Maximum 6 words
- No quotes or punctuation
- Capture the main topic

User question: {userMessage}
Assistant response summary: {assistantFirstParagraph}

Title:`;

// Call async, don't block UI
async function generateTitle(userMsg: string, assistantMsg: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(
    TITLE_PROMPT
      .replace('{userMessage}', userMsg.slice(0, 500))
      .replace('{assistantFirstParagraph}', assistantMsg.slice(0, 300))
  );
  return result.response.text().trim().slice(0, 60);
}
```

### Pattern 5: Sidebar State with Cookie Persistence
**What:** shadcn/ui Sidebar uses cookies for state persistence
**When to use:** Default pattern from shadcn
**Example:**
```typescript
// Source: shadcn/ui Sidebar docs
// Server component reads cookie
export default async function ChatLayout({ children }) {
  const cookieStore = cookies();
  const sidebarOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <ChatSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
```

### Anti-Patterns to Avoid
- **Storing messages as subcollection:** Overkill for consultations with <100 messages; adds read costs
- **Saving on every keystroke:** Use debounce to batch writes
- **Blocking UI for title generation:** Generate async, show placeholder
- **Fetching all messages in list view:** Only fetch metadata (title, date) for list; load full messages when opened

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible sidebar | Custom CSS/JS animation | shadcn/ui Sidebar + Collapsible | Handles keyboard shortcuts, mobile sheet, accessibility, persistence |
| Save debouncing | setTimeout/clearTimeout manually | lodash.debounce or useDebouncedCallback | Edge cases with cleanup, stale closures |
| Confirmation dialogs | Custom modal | Built-in `window.confirm` or AlertDialog | Simple delete confirmation doesn't need custom UI |
| beforeunload handling | Custom implementation | `useBeforeUnload` from react-router or custom hook | Browser inconsistencies, mobile limitations |

**Key insight:** The shadcn/ui Sidebar component handles collapsible state, keyboard shortcuts (Cmd+B), mobile responsiveness (Sheet component), and cookie persistence out of the box. Building custom loses these features.

## Common Pitfalls

### Pitfall 1: Firestore Document Size Limit
**What goes wrong:** Hitting 1MB document limit with many long messages
**Why it happens:** Legal consultations can have long assistant responses with citations
**How to avoid:** Monitor message array size; if approaching limit (~50KB per message * 20 messages = 1MB), archive older messages or switch to subcollection
**Warning signs:** Document write failures, unusually slow reads

### Pitfall 2: beforeunload Unreliability on Mobile
**What goes wrong:** Save prompt never shows on mobile browsers
**Why it happens:** Mobile browsers don't reliably fire beforeunload event
**How to avoid:** Primary save trigger should be "New Consultation" button, not page unload. Unload is backup only.
**Warning signs:** Users report losing unsaved chats on mobile

### Pitfall 3: Stale Closure in Debounced Save
**What goes wrong:** Debounced function captures old messages array
**Why it happens:** Closure captures state at creation time
**How to avoid:** Use `useCallback` with messages in dependency array, or use ref for latest messages
**Warning signs:** Only partial messages saved, "bouncing" between states

### Pitfall 4: Sidebar Blocking Main Content on Mobile
**What goes wrong:** Sidebar covers chat input on small screens
**Why it happens:** Using sidebar variant without mobile handling
**How to avoid:** Use shadcn Sidebar which auto-converts to Sheet on mobile via `isMobile` hook
**Warning signs:** Users can't type messages when sidebar is open on mobile

### Pitfall 5: Title Generation Race Condition
**What goes wrong:** Multiple title generations for same consultation
**Why it happens:** Title generation triggered on message without checking if title exists
**How to avoid:** Check `!consultation.title || consultation.title === 'Placeholder'` before generating
**Warning signs:** Excessive Gemini API calls, title keeps changing

### Pitfall 6: Firestore Security Rules Not Updated
**What goes wrong:** Users can read other users' consultations
**Why it happens:** Subcollection rules don't inherit from parent
**How to avoid:** Explicit security rules for `users/{uid}/consultations/{docId}` matching `request.auth.uid == uid`
**Warning signs:** Security audit failure, data exposure

## Code Examples

Verified patterns from official sources:

### Firestore Security Rules for Consultations
```javascript
// Source: Firebase Security Rules docs
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing user document rules...
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      // Consultations subcollection - user can only access their own
      match /consultations/{consultationId} {
        allow read, write: if request.auth.uid == userId;
      }
    }
  }
}
```

### Save Preference Toggle
```typescript
// Source: Existing firestore.ts pattern
export async function updateSavePreference(uid: string, saveByDefault: boolean): Promise<void> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { saveByDefault, updatedAt: new Date() }, { merge: true });
}

export async function getSavePreference(uid: string): Promise<boolean> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);
  // Default to true (save by default) per CONTEXT.md decision
  return snapshot.exists() ? (snapshot.data().saveByDefault ?? true) : true;
}
```

### Consultation List Query
```typescript
// Source: Firebase query-data docs
export async function getUserConsultations(uid: string, limit = 50): Promise<ConsultationMeta[]> {
  const db = getFirebaseFirestore();
  const consultationsRef = collection(db, 'users', uid, 'consultations');
  const q = query(
    consultationsRef,
    where('savePreference', '==', 'save'), // Only saved ones
    orderBy('updatedAt', 'desc'),
    limit(limit)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    title: doc.data().title,
    updatedAt: doc.data().updatedAt?.toDate(),
    topic: doc.data().context?.topic,
  }));
}
```

### beforeunload Hook
```typescript
// Source: MDN + React patterns
export function useBeforeUnload(shouldPrompt: boolean, onBeforeUnload?: () => void) {
  useEffect(() => {
    if (!shouldPrompt) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      onBeforeUnload?.();
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldPrompt, onBeforeUnload]);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage only | Firestore + localStorage dual | Established pattern | Reliability, cross-device sync |
| Flat collections | User-scoped subcollections | Firestore v2 rules | Better security, simpler rules |
| Full page reload on history click | SPA state update | React standard | Smoother UX |
| Custom sidebar CSS | shadcn/ui Sidebar (Jan 2026) | shadcn update | Better mobile, accessibility |

**Deprecated/outdated:**
- `Prompt` from react-router v5 for navigation blocking (use `useBlocker` in v6+)
- `returnValue` string in beforeunload (browsers ignore custom text now)

## Open Questions

Things that couldn't be fully resolved:

1. **Continuation vs Read-Only for Saved Chats**
   - What we know: Both patterns exist in chat applications
   - What's unclear: User expectation in legal consultation context
   - Recommendation: Allow continuation - simpler implementation, matches user mental model. If they want a fresh start, "New Consultation" is available.

2. **Maximum Consultations to Store**
   - What we know: Firestore scales well, cost is per-read
   - What's unclear: What's reasonable for a legal consultation app?
   - Recommendation: No hard limit initially; monitor usage. If costs become concern, add archival after 100 consultations or 6 months.

3. **Title Language**
   - What we know: App is in Lithuanian, users are Lithuanian speakers
   - What's unclear: Should prompt explicitly request Lithuanian?
   - Recommendation: Yes, specify Lithuanian in title prompt to avoid English titles.

## Sources

### Primary (HIGH confidence)
- Firebase official docs: Firestore data structure, security rules, subcollections
- shadcn/ui Sidebar docs (ui.shadcn.com/docs/components/sidebar)
- Existing codebase: SubscriptionContext.tsx, firestore.ts patterns

### Secondary (MEDIUM confidence)
- [Firestore chat data model best practices](https://medium.com/@henryifebunandu/cloud-firestore-db-structure-for-your-chat-application-64ec77a9f9c0)
- [Firestore query performance 2026](https://estuary.dev/blog/firestore-query-best-practices/)
- [beforeunload MDN docs](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)
- [Prompt engineering guide - summarization](https://www.promptingguide.ai/prompts/text-summarization)

### Tertiary (LOW confidence)
- WebSearch results on title generation prompts (no authoritative source found)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use
- Architecture: HIGH - follows existing Firestore patterns in codebase
- Pitfalls: MEDIUM - some based on general experience, not all verified for this specific use case

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (30 days - stable domain, no fast-moving dependencies)
