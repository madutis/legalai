# Codebase Concerns

**Analysis Date:** 2026-01-14

## Tech Debt

**Large Components:**
- Issue: `src/components/chat/ChatInterface.tsx` is 658 lines with mixed concerns
- Why: Rapid development, all chat logic in one place
- Impact: Hard to maintain, test, and modify
- Fix approach: Extract regex parsing, question handling, and rendering into separate utilities/components

**Monolithic Service Modules:**
- Issue: `src/lib/gemini/index.ts` is 491 lines handling embeddings, extraction, and RAG
- Why: Started simple, grew organically
- Impact: Difficult to unit test individual functions
- Fix approach: Split into `embeddings.ts`, `extraction.ts`, `rag.ts` modules

**Missing Input Validation:**
- Issue: Multiple `parseInt()` calls without NaN validation
- Files: `src/app/api/chat/route.ts:17,24,31`, `src/app/api/article/[articleNumber]/route.ts:10`
- Why: TypeScript types provide false sense of security
- Impact: Potential runtime errors on malformed input
- Fix approach: Add explicit validation with fallback values

## Known Bugs

**No Critical Bugs Detected**

**Potential Issues:**
- Race condition risk with Date.now() for message IDs (`src/hooks/useChat.ts:46-54`)
  - Symptoms: ID collision if two messages sent within same millisecond
  - Workaround: Comment acknowledges issue, generates IDs together
  - Fix: Use UUID v4 or nanoid instead

## Security Considerations

**Environment Variable Handling:**
- Risk: Non-null assertions on env vars can crash if missing
- Files: `src/lib/gemini/index.ts:7`, `src/lib/pinecone/index.ts:8`
- Current mitigation: None (assumes vars always set)
- Recommendations: Add startup validation, fail fast with clear error

**Service Account Key:**
- Risk: `serviceAccountKey.json` contains sensitive credentials
- Current mitigation: Should be in .gitignore
- Recommendations: Verify not committed, use Vercel secrets instead

**XSS in PDF Export:**
- Risk: HTML injection via `document.write()` in `src/lib/pdf-export.ts:257-268`
- Current mitigation: `escapeHtml()` function used
- Recommendations: Use safer DOM APIs instead of write()

## Performance Bottlenecks

**Streaming Response Size:**
- Problem: Full context sent with every message (10 messages history)
- File: `src/hooks/useChat.ts:96-99`
- Measurement: Not profiled
- Cause: No context summarization or truncation
- Improvement path: Limit history, summarize older messages

**Hybrid Search:**
- Problem: Three parallel Pinecone queries per request
- File: `src/lib/pinecone/index.ts` (searchHybrid)
- Measurement: Not profiled
- Cause: Design choice for comprehensive retrieval
- Improvement path: Cache common queries, reduce result counts

## Fragile Areas

**Stream Parsing:**
- File: `src/hooks/useChat.ts:125-180`
- Why fragile: Complex SSE event parsing with multiple event types
- Common failures: Invalid JSON silently skipped, connection drops
- Safe modification: Add comprehensive error handling, connection retry
- Test coverage: None

**Question Tag Parsing:**
- File: `src/components/chat/ChatInterface.tsx:48-95`
- Why fragile: Regex-based parsing of LLM output
- Common failures: Malformed tags, nested content
- Safe modification: Extract to utility, add tests
- Test coverage: None

## Scaling Limits

**SQLite in Serverless:**
- Current capacity: Works with read-only mode
- Limit: Cannot write to database in serverless
- Symptoms at limit: Write operations fail silently
- Scaling path: Already using read-only mode, works for current use case

**Vercel Function Timeout:**
- Current capacity: 60s timeout for /api/chat
- Limit: Complex queries may exceed timeout
- Symptoms at limit: 504 Gateway Timeout
- Scaling path: Vercel Pro for longer timeouts, or streaming keeps connection alive

## Dependencies at Risk

**No Major Risks Detected**

**Monitor:**
- @google/generative-ai - Active development, API may change
- @pinecone-database/pinecone - Active, watch for breaking changes
- better-sqlite3 - Stable, native module may need rebuild on Node upgrades

## Missing Critical Features

**No Test Infrastructure:**
- Problem: Zero test files, no test framework
- Current workaround: Manual testing, script-based verification
- Blocks: Cannot verify changes don't break existing functionality
- Implementation complexity: Medium (add Vitest, write initial tests)

**No Error Tracking:**
- Problem: No Sentry or similar service
- Current workaround: Vercel logs
- Blocks: Cannot proactively identify production errors
- Implementation complexity: Low (add Sentry SDK)

## Test Coverage Gaps

**RAG Pipeline:**
- What's not tested: Article extraction, search ranking, context assembly
- Risk: Changes could break answer quality without detection
- Priority: High
- Difficulty to test: Medium (need to mock external APIs)

**Streaming Logic:**
- What's not tested: SSE parsing, error recovery, fallback model
- Risk: Connection issues could break chat silently
- Priority: High
- Difficulty to test: Medium (need to mock fetch/stream)

**API Routes:**
- What's not tested: /api/chat, /api/article, /api/ruling
- Risk: Changes could break endpoints
- Priority: High
- Difficulty to test: Low (can use supertest or similar)

---

*Concerns audit: 2026-01-14*
*Update as issues are fixed or new ones discovered*
