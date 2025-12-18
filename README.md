# Darbo teisės asistentas

AI-powered Lithuanian employment law assistant. Get answers to labor law questions based on the Lithuanian Labor Code and Supreme Court (LAT) rulings.

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS, shadcn/ui
- **AI**: Google Gemini 3 Flash (gemini-3-flash-preview)
- **Vector DB**: Pinecone (RAG retrieval)
- **Embeddings**: Google text-embedding-004

## Features

- RAG-based answers citing specific Labor Code articles
- Hybrid search: Gemini article identification + semantic search
- Clickable article references linking to e-TAR (official legal registry)
- LAT ruling modal with full text display
- Onboarding flow: role, company size, topic selection
- Context-aware responses based on user profile

## Data Sources

- **Labor Code**: 264 articles, article-level chunking
- **LAT Rulings**: ~4,000 chunks from Supreme Court decisions (2015-2025)

## Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
```

Required env vars:
```
GOOGLE_GENERATIVE_AI_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=law-agent
```

```bash
# Run development server
npm run dev
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── chat/page.tsx         # Chat interface
│   └── api/
│       ├── chat/route.ts     # Chat API (streaming)
│       ├── article/[articleNumber]/route.ts
│       └── ruling/[docId]/route.ts
├── components/
│   └── chat/
│       ├── ChatInterface.tsx
│       ├── OnboardingModal.tsx
│       ├── ArticleModal.tsx
│       └── RulingModal.tsx
├── lib/
│   ├── gemini/index.ts       # Gemini API, RAG, article extraction
│   └── pinecone/index.ts     # Vector search, article fetch
└── hooks/
    └── useChat.ts            # Chat state management
```

## Scripts

```bash
# Ingest documents to Pinecone
npx tsx scripts/ingest-documents.ts

# Re-ingest Labor Code with article chunking
npx tsx scripts/reingest-labor-code.ts
```

## Deployment

Deployed on Vercel. Environment variables must be set in Vercel dashboard.

```bash
vercel deploy --prod
```

## Disclaimer

This system provides informational consultations only. For complex cases, consult a qualified lawyer.
