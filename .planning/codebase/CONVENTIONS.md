# Coding Conventions

**Analysis Date:** 2026-01-14

## Naming Patterns

**Files:**
- `PascalCase.tsx` - React components in `components/chat/` (ChatInterface, RulingModal)
- `kebab-case.tsx` - UI components in `components/ui/` (button, card, input)
- `use*.ts(x)` - React hooks (useChat.ts, useAuth.tsx)
- `route.ts` - Next.js API routes
- `page.tsx`, `layout.tsx` - Next.js special files

**Functions:**
- camelCase for all functions
- No async prefix (async functions not specially named)
- `handle*` for event handlers (handleSubmit, handleNewConsultation)
- `get*` for getters (getPinecone, getIndex, getDbPath)
- `extract*` for parsing (extractExplicitArticleNumbers, extractRelevantArticles)

**Variables:**
- camelCase for variables (isLoading, messageId, consultationFinishedAt)
- UPPER_SNAKE_CASE for constants (MAX_FOLLOW_UPS, ROLE_LABELS, MODELS)
- No underscore prefix for private members

**Types:**
- PascalCase for interfaces (Message, ChatContext, ArticleData)
- PascalCase for type aliases (UserRole = 'employer' | 'employee' | ...)
- No `I` prefix for interfaces
- Props interfaces: `{Component}Props` (ArticleModalProps, ChatInterfaceProps)

## Code Style

**Formatting:**
- No Prettier config (uses ESLint formatting)
- 2-space indentation
- Single quotes for strings
- Semicolons required
- ~100 character line length (implicit)

**Linting:**
- ESLint 9 with flat config (`eslint.config.mjs`)
- Extends: Next.js core-web-vitals, TypeScript rules
- Run: `npm run lint`

## Import Organization

**Order:**
1. React/Next.js imports
2. External packages (firebase, pinecone, etc.)
3. Internal modules (@/lib/*, @/components/*, @/hooks/*)
4. Relative imports (./*, ../*)
5. Type imports (import type {})

**Grouping:**
- No enforced blank lines between groups
- Type imports often on same line or grouped with regular imports

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in tsconfig.json)

## Error Handling

**Patterns:**
- try/catch at API route level
- Stream errors as SSE events in chat API
- Silent skip of invalid JSON in stream parsing
- Redirect on invalid state (missing context)

**Error Types:**
- Throw Error with descriptive messages
- No custom error classes
- No Result<T, E> pattern

## Logging

**Framework:**
- console.log for normal output
- console.error for errors
- No structured logging library

**Patterns:**
- Status updates in streaming responses
- Error logging before returning error response

## Comments

**When to Comment:**
- Complex regex patterns get inline comments
- Section headers for major code blocks
- Explanation of workarounds or edge cases

**JSDoc/TSDoc:**
- Not used
- Types serve as documentation

**TODO Comments:**
- Format: `// TODO: description` or `// FIXME: description`
- Found in: `src/app/api/chat/route.ts`, `src/lib/gemini/index.ts`

## Function Design

**Size:**
- Large functions exist (658 lines in ChatInterface)
- No enforced size limit
- Complex logic often inline

**Parameters:**
- Objects for multiple parameters (context?: ChatContext)
- Destructuring in function body common
- Optional parameters with `?`

**Return Values:**
- Explicit returns
- Promise<T> for async functions
- void for event handlers

## Module Design

**Exports:**
- Named exports preferred
- Default exports for React components in app/
- Function-based modules (not class-based)

**Barrel Files:**
- `src/lib/firebase/index.ts` - Re-exports auth and consultations
- Not consistently used elsewhere

**Patterns:**
- Singleton for API clients (Pinecone, Gemini via lazy init)
- Module-level variables for caching

## Component Patterns

**Structure:**
- 'use client' directive for client components
- Props interface defined before component
- Hooks at top of component
- Event handlers as inner functions
- JSX return at bottom

**Example:**
```typescript
'use client';

interface ComponentProps {
  prop: string;
  onAction: () => void;
}

export function Component({ prop, onAction }: ComponentProps) {
  const [state, setState] = useState(false);

  const handleClick = () => {
    onAction();
  };

  return <div onClick={handleClick}>{prop}</div>;
}
```

**State Management:**
- useState for local state
- useContext for global state (auth, theme)
- localStorage for persistent client state
- No Redux or other state library

---

*Convention analysis: 2026-01-14*
*Update when patterns change*
