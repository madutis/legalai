# Codebase Structure

**Analysis Date:** 2026-01-14

## Directory Layout

```
legalai/
├── src/                    # Application source code
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Services and utilities
│   └── types/             # TypeScript definitions
├── scripts/               # Data processing scripts
├── data/                  # PDF files and database
├── public/                # Static assets
├── .planning/             # GSD planning files
└── [config files]         # Project configuration
```

## Directory Purposes

**src/app/**
- Purpose: Next.js App Router pages and API routes
- Contains: Page components, layouts, API handlers
- Key files: `layout.tsx`, `page.tsx`, `providers.tsx`, `globals.css`
- Subdirectories:
  - `chat/` - Chat page
  - `api/chat/` - RAG chat endpoint
  - `api/article/[articleNumber]/` - Article fetch
  - `api/ruling/[docId]/` - Ruling fetch

**src/components/**
- Purpose: Reusable React components
- Contains: UI components, chat-specific components
- Key files: ChatInterface, modals, buttons
- Subdirectories:
  - `ui/` - shadcn/ui base components (button, card, input, etc.)
  - `chat/` - Chat components (ChatInterface, RulingModal, ArticleModal, OnboardingModal)
  - `layout/` - Layout components

**src/hooks/**
- Purpose: Custom React hooks
- Contains: State management, side effects
- Key files:
  - `useChat.ts` - Chat logic with streaming
  - `useAuth.tsx` - Authentication context and hook

**src/lib/**
- Purpose: Business logic and service integrations
- Contains: External API clients, utilities
- Subdirectories:
  - `gemini/index.ts` - Google Gemini integration (embeddings, extraction, RAG)
  - `pinecone/index.ts` - Vector database operations
  - `firebase/` - Firebase auth and Firestore
    - `config.ts` - Firebase initialization
    - `auth.ts` - Authentication functions
    - `consultations.ts` - Consultation CRUD
  - `db/index.ts` - SQLite database for LAT cases
- Key files:
  - `utils.ts` - CSS class utilities (cn function)
  - `topics.ts` - Topic configuration
  - `pdf-export.ts` - PDF generation for consultations

**src/types/**
- Purpose: TypeScript type definitions
- Contains: Shared interfaces
- Key files: `index.ts` - User, Consultation, Message types

**scripts/**
- Purpose: Data processing and ingestion
- Contains: CLI scripts for data pipeline
- Key files:
  - `sync-lat-rulings.ts` - Sync LAT PDFs (main orchestrator)
  - `lat/1-download.ts` - Download PDFs from LAT website
  - `lat/2-extract.ts` - Extract text using Gemini
  - `lat/3-ingest.ts` - Ingest to Pinecone/SQLite
  - `ingest-documents.ts` - Labor Code ingestion
  - `ingest-nutarimai.ts` - Government decisions ingestion
  - `setup-pinecone.ts` - Initialize Pinecone index

**data/**
- Purpose: Data files and local database
- Contains: PDF files, SQLite database
- Key files:
  - `lat.db` - SQLite database with LAT cases
  - `lat-pdfs/` - Downloaded PDF files by year

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx` - Root layout
- `src/app/page.tsx` - Home page (onboarding)
- `src/app/chat/page.tsx` - Chat interface
- `src/app/api/chat/route.ts` - Main API endpoint

**Configuration:**
- `tsconfig.json` - TypeScript (path alias `@/*` → `./src/*`)
- `next.config.ts` - Next.js settings
- `package.json` - Dependencies and scripts
- `eslint.config.mjs` - Linting rules
- `postcss.config.mjs` - Tailwind/PostCSS
- `components.json` - shadcn/ui config
- `.env.example` - Environment template

**Core Logic:**
- `src/lib/gemini/index.ts` - AI/LLM integration
- `src/lib/pinecone/index.ts` - Vector search
- `src/lib/db/index.ts` - SQLite operations
- `src/hooks/useChat.ts` - Chat state management

**UI Components:**
- `src/components/chat/ChatInterface.tsx` - Main chat component
- `src/components/chat/RulingModal.tsx` - LAT ruling display
- `src/components/chat/ArticleModal.tsx` - Article display
- `src/components/ui/*.tsx` - shadcn/ui components

## Naming Conventions

**Files:**
- `kebab-case.tsx` - React components (except shadcn/ui)
- `PascalCase.tsx` - Component files in chat/
- `use*.ts(x)` - React hooks
- `*.test.ts` - Test files (not present)
- `route.ts` - API route handlers

**Directories:**
- `kebab-case` - All directories
- `[param]` - Dynamic route segments

**Special Patterns:**
- `index.ts` - Module exports in lib/
- `layout.tsx` - Next.js layout files
- `page.tsx` - Next.js page files
- `providers.tsx` - React context providers

## Where to Add New Code

**New Feature:**
- Primary code: `src/components/` or `src/lib/`
- Tests: Not applicable (no test setup)
- Types: `src/types/index.ts`

**New API Endpoint:**
- Definition: `src/app/api/{feature}/route.ts`
- Handler logic: In route file or extract to `src/lib/`

**New Component:**
- UI primitive: `src/components/ui/`
- Feature component: `src/components/{feature}/`

**New Page:**
- Page file: `src/app/{route}/page.tsx`
- Layout if needed: `src/app/{route}/layout.tsx`

**New Service Integration:**
- Implementation: `src/lib/{service}/index.ts`
- Types: `src/types/index.ts`

**New Script:**
- One-off: `scripts/{name}.ts`
- Pipeline step: `scripts/lat/{n}-{name}.ts`

## Special Directories

**.planning/**
- Purpose: GSD planning and codebase documentation
- Source: Generated by GSD commands
- Committed: Yes

**data/**
- Purpose: Runtime data (PDFs, SQLite database)
- Source: Generated by scripts
- Committed: Partially (structure, not large files)

**.next/**
- Purpose: Next.js build output
- Source: Auto-generated
- Committed: No (in .gitignore)

**.vercel/**
- Purpose: Vercel deployment config
- Source: Vercel CLI
- Committed: Yes

---

*Structure analysis: 2026-01-14*
*Update when directory structure changes*
