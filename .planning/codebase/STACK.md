# Technology Stack

**Analysis Date:** 2026-01-14

## Languages

**Primary:**
- TypeScript 5 - All application code (`package.json`, `tsconfig.json`)

**Secondary:**
- JavaScript - Config files (`eslint.config.mjs`, `postcss.config.mjs`)

## Runtime

**Environment:**
- Node.js 20+ (Vercel serverless runtime)
- Browser runtime for client components

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.0.10 - Full-stack web framework (`next.config.ts`)
- React 19.2.1 - UI library

**UI:**
- Tailwind CSS 4 - Utility-first CSS (`postcss.config.mjs`)
- shadcn/ui - Component library (`components.json`)
- Radix UI primitives - Avatar, ScrollArea, Separator, Tabs, Slot

**Testing:**
- None configured (no test framework)

**Build/Dev:**
- TypeScript 5 - Compilation
- PostCSS - CSS processing
- ESLint 9 - Linting (`eslint.config.mjs`)
- tsx 4.21.0 - TypeScript execution for scripts

## Key Dependencies

**Critical:**
- @google/generative-ai 0.24.1 - Gemini LLM integration (`src/lib/gemini/index.ts`)
- @ai-sdk/google 2.0.49 - AI SDK for Google models
- @pinecone-database/pinecone 6.1.3 - Vector database (`src/lib/pinecone/index.ts`)
- firebase 12.7.0 - Authentication and Firestore (`src/lib/firebase/`)
- better-sqlite3 12.6.0 - Local database for LAT cases (`src/lib/db/index.ts`)

**UI:**
- next-themes 0.4.6 - Dark mode support (`src/app/providers.tsx`)
- lucide-react 0.561.0 - Icon library
- react-markdown 10.1.0 - Markdown rendering
- clsx 2.1.1 + tailwind-merge 3.4.0 - CSS utilities

**PDF Processing:**
- jspdf 4.0.0 - PDF generation
- pdf-lib 1.17.1 - PDF manipulation
- unpdf 1.4.0 - PDF text extraction
- pdfjs-dist 5.4.449 - PDF parsing

**Google Cloud:**
- @google-cloud/aiplatform 6.0.0
- @google-cloud/documentai 9.5.0
- @google-cloud/storage 7.18.0

## Configuration

**Environment:**
- `.env.local` - Local environment variables (gitignored)
- `.env.example` - Template for required variables
- Key vars: `GOOGLE_GENERATIVE_AI_API_KEY`, `PINECONE_API_KEY`, `NEXT_PUBLIC_FIREBASE_*`

**Build:**
- `tsconfig.json` - TypeScript config (strict mode, path alias `@/*` → `./src/*`)
- `next.config.ts` - Next.js configuration
- `postcss.config.mjs` - PostCSS/Tailwind setup
- `eslint.config.mjs` - ESLint flat config with Next.js rules
- `components.json` - shadcn/ui component settings

## Platform Requirements

**Development:**
- Any platform with Node.js 20+
- No Docker required

**Production:**
- Vercel - Serverless hosting
- 60s max function timeout for `/api/chat`

---

*Stack analysis: 2026-01-14*
*Update after major dependency changes*
