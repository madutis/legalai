# Testing Patterns

**Analysis Date:** 2026-01-14

## Test Framework

**Runner:**
- None configured
- No Jest, Vitest, or other test framework installed

**Assertion Library:**
- Not applicable

**Run Commands:**
```bash
npm run lint                  # Only linting available
npm run build                 # Build-time type checking
```

## Test File Organization

**Location:**
- No test files present
- No `*.test.ts`, `*.spec.ts`, or `__tests__/` directories

**Naming:**
- Not applicable (no tests)

**Structure:**
- Tests would logically be co-located with source files if added

## Test Structure

**Suite Organization:**
- Not applicable

**Patterns:**
- Not applicable

## Mocking

**Framework:**
- Not applicable

**Patterns:**
- Not applicable

**What Would Need Mocking:**
- External APIs (Gemini, Pinecone, Firebase)
- File system operations
- fetch for API calls

## Fixtures and Factories

**Test Data:**
- Not applicable

**Location:**
- If added: `tests/fixtures/` or co-located

## Coverage

**Requirements:**
- None enforced
- No coverage tooling

**Configuration:**
- `coverage/` in `.gitignore` (prepared for future)

## Test Types

**Unit Tests:**
- Not present
- Would cover: utilities, parsing functions, data transformations

**Integration Tests:**
- Not present
- Would cover: API routes, service layer interactions

**E2E Tests:**
- Not present
- Would cover: Full chat flow, onboarding, PDF export

## Manual Testing Scripts

**Available in scripts/:**
- `test-pdf-extract.ts` - Test PDF extraction
- `test-rag.ts` - Test RAG retrieval
- `test-queries.ts` - Test specific queries
- `test-specific.ts` - Manual test harness

**Run:**
```bash
npx tsx scripts/test-rag.ts
npx tsx scripts/test-queries.ts
```

## Current Testing Approach

**Manual Testing:**
- `npm run dev` and browser testing
- Script-based testing for RAG pipeline

**Build-Time Checks:**
- TypeScript strict mode (`"strict": true`)
- ESLint with Next.js rules
- Type errors caught during `npm run build`

## Recommendations (Not Implemented)

**If Testing Were Added:**

**Framework Choice:**
- Vitest (ESM-native, fast, TypeScript support)
- Or Jest with ts-jest

**Priority Areas:**
1. RAG pipeline (article extraction, search, response generation)
2. API routes (chat, article, ruling endpoints)
3. Chat state management (useChat hook)
4. Parsing functions (questions, citations)

**Structure:**
```
src/
├── lib/
│   ├── gemini/
│   │   ├── index.ts
│   │   └── index.test.ts
│   └── pinecone/
│       ├── index.ts
│       └── index.test.ts
├── hooks/
│   ├── useChat.ts
│   └── useChat.test.ts
└── components/
    └── chat/
        ├── ChatInterface.tsx
        └── ChatInterface.test.tsx
```

**E2E Recommendation:**
- Playwright for browser automation
- Test: Onboarding flow, chat conversation, PDF export

---

*Testing analysis: 2026-01-14*
*Update when test patterns change*
