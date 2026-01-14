# Architecture

**Analysis Date:** 2026-01-14

## Pattern Overview

**Overall:** Full-Stack Next.js RAG Application

**Key Characteristics:**
- Next.js App Router with server and client components
- RAG (Retrieval-Augmented Generation) pattern for AI responses
- Streaming API responses via Server-Sent Events (SSE)
- Hybrid search across multiple document types
- Context-aware personalization based on user profile

## Layers

**Presentation Layer (Client-Side):**
- Purpose: UI rendering and user interaction
- Contains: React components, pages, hooks
- Location: `src/app/`, `src/components/`, `src/hooks/`
- Depends on: API layer for data
- Used by: End users via browser

**API Layer (Server-Side):**
- Purpose: Handle HTTP requests, orchestrate services
- Contains: Next.js route handlers, streaming endpoints
- Location: `src/app/api/`
- Depends on: Service layer for business logic
- Used by: Presentation layer

**Service Layer:**
- Purpose: Core business logic and external integrations
- Contains: Gemini integration, Pinecone search, Firebase auth
- Location: `src/lib/gemini/`, `src/lib/pinecone/`, `src/lib/firebase/`
- Depends on: Data layer, external APIs
- Used by: API layer

**Data Layer:**
- Purpose: Data persistence and retrieval
- Contains: SQLite database, Firebase Firestore
- Location: `src/lib/db/`, `src/lib/firebase/`
- Depends on: Database files, cloud services
- Used by: Service layer

**Utility Layer:**
- Purpose: Shared helpers and type definitions
- Contains: CSS utilities, topic config, type definitions
- Location: `src/lib/utils.ts`, `src/lib/topics.ts`, `src/types/`
- Depends on: Nothing (pure functions)
- Used by: All layers

## Data Flow

**Chat Request Lifecycle:**

1. User enters message in `ChatInterface` component
2. `useChat` hook sends POST to `/api/chat`
3. API route extracts article numbers (regex + Gemini)
4. Generates embedding via Google text-embedding-004
5. Hybrid search in Pinecone:
   - Legislation: 8 results
   - LAT rulings: 4-8 results
   - Nutarimai: 2-4 results
6. Direct fetch of identified articles
7. Deduplicate and assemble context
8. Stream RAG response via SSE:
   - Status updates
   - Metadata with sources
   - Text chunks
   - [DONE] signal
9. Frontend parses response, renders UI
10. Optional: Save to Firebase Firestore

**State Management:**
- Client state: React hooks (useState, useContext)
- Persistent state: localStorage for user context
- Server state: Firestore for consultations, SQLite for cases

## Key Abstractions

**Streaming Response:**
- Purpose: Real-time AI response delivery
- Location: `src/app/api/chat/route.ts`
- Pattern: ReadableStream with SSE events
- Event types: status, metadata, text, error, [DONE]

**Hybrid Search:**
- Purpose: Multi-document type retrieval
- Location: `src/lib/pinecone/index.ts`
- Pattern: Parallel queries with result merging
- Function: `searchHybrid(embedding, legislationK, rulingsK, nutarimaiK)`

**Article Extraction:**
- Purpose: Identify relevant Labor Code articles
- Location: `src/lib/gemini/index.ts`
- Pattern: Regex + LLM extraction
- Functions: `extractExplicitArticleNumbers()`, `extractRelevantArticles()`

**Structured Questions:**
- Purpose: Interactive clarification in chat
- Pattern: XML-like tags in response: `[KLAUSIMAS]...[/KLAUSIMAS]`
- Parsing: `src/components/chat/ChatInterface.tsx`

**Context Provider:**
- Purpose: App-wide state (theme, auth)
- Location: `src/app/providers.tsx`
- Pattern: React Context with ThemeProvider + AuthProvider

## Entry Points

**Frontend:**
- `src/app/layout.tsx` - Root layout with providers
- `src/app/page.tsx` - Home/onboarding page
- `src/app/chat/page.tsx` - Chat interface page

**API:**
- `src/app/api/chat/route.ts` - Main RAG endpoint (POST, streaming)
- `src/app/api/article/[articleNumber]/route.ts` - Article fetch (GET)
- `src/app/api/ruling/[docId]/route.ts` - Ruling fetch (GET)

**Scripts:**
- `scripts/sync-lat-rulings.ts` - Sync LAT PDFs
- `scripts/lat/*.ts` - Download, extract, ingest pipeline
- `scripts/ingest-*.ts` - Pinecone ingestion

## Error Handling

**Strategy:** Try-catch at API boundaries, stream errors as events

**Patterns:**
- API routes catch errors, return error event in stream
- Fallback model on primary failure (`src/hooks/useChat.ts`)
- Silent skip of invalid JSON in stream parsing
- Redirect to home on invalid context (`src/app/chat/page.tsx`)

## Cross-Cutting Concerns

**Logging:**
- Console.log/error for development
- Vercel logs in production

**Validation:**
- TypeScript strict mode for type safety
- Minimal runtime validation (parseInt with isNaN)
- No schema validation library (no Zod)

**Authentication:**
- Firebase Auth with React Context
- Protected routes check context, redirect if missing

---

*Architecture analysis: 2026-01-14*
*Update when major patterns change*
