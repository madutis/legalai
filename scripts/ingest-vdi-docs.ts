import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { extractText } from 'unpdf';

// Lazy-initialized clients (for dry-run support)
let pinecone: Pinecone | null = null;
let genAI: GoogleGenerativeAI | null = null;

function getPinecone(): Pinecone {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pinecone;
}

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
  }
  return genAI;
}

interface ManifestItem {
  id: string;
  title: string;
  type: 'pdf' | 'page';
  url: string;
  sourceUrl: string;
  tier: number;
  reason: string;
  topics: string[];
  content_preview: string;
}

interface Manifest {
  discovered: string;
  sources_crawled: string[];
  items: ManifestItem[];
}

interface DocumentChunk {
  docId: string;
  title: string;
  text: string;
  chunkIndex: number;
  totalChunks: number;
  sourceUrl: string;
  tier: number;
  topics: string;
}

async function fetchPdfContent(url: string): Promise<string> {
  console.log(`  Fetching PDF: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const { text: pages } = await extractText(new Uint8Array(arrayBuffer));

  // unpdf returns array of strings (one per page)
  const fullText = Array.isArray(pages) ? pages.join('\n\n') : pages;
  return fullText;
}

async function fetchPageContent(url: string): Promise<string> {
  console.log(`  Fetching page: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'lt,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove navigation, header, footer, scripts, styles
  $('nav, header, footer, script, style, .nav, .header, .footer, .sidebar, .menu').remove();

  // Try to find main content area
  let content = '';
  const mainSelectors = ['main', 'article', '.content', '.main-content', '#content', '#main'];

  for (const selector of mainSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      content = element.text();
      break;
    }
  }

  // Fallback to body if no main content found
  if (!content) {
    content = $('body').text();
  }

  return cleanText(content);
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

// Sanitize ID to ASCII only (Pinecone requirement)
function sanitizeId(id: string): string {
  return id
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with dash
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-|-$/g, '') // Trim dashes from ends
    .slice(0, 100); // Limit length
}

function chunkContent(text: string, chunkSize: number = 1500, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + chunkSize / 2) {
        end = breakPoint + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) { // Skip very small chunks
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start < 0) start = 0;
    if (end >= text.length) break;
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function processDocument(item: ManifestItem): Promise<DocumentChunk[]> {
  let content: string;

  try {
    if (item.type === 'pdf') {
      content = await fetchPdfContent(item.url);
    } else {
      content = await fetchPageContent(item.url);
    }
  } catch (error) {
    console.error(`  Failed to fetch content for ${item.title}: ${error}`);
    return [];
  }

  if (content.length < 100) {
    console.log(`  Skipping ${item.title}: content too short (${content.length} chars)`);
    return [];
  }

  const textChunks = chunkContent(content);
  console.log(`  ${item.title}: ${content.length} chars -> ${textChunks.length} chunks`);

  return textChunks.map((text, index) => ({
    docId: item.id,
    title: item.title,
    text,
    chunkIndex: index,
    totalChunks: textChunks.length,
    sourceUrl: item.url,
    tier: item.tier,
    topics: item.topics.join(', '),
  }));
}

async function ingestDocuments(
  chunks: DocumentChunk[],
  index: ReturnType<Pinecone['index']>,
  dryRun: boolean
): Promise<number> {
  console.log(`\nProcessing ${chunks.length} chunks...`);

  const vectors = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    console.log(`Processing ${i + 1}/${chunks.length}: ${chunk.title} (${chunk.chunkIndex + 1}/${chunk.totalChunks})`);

    if (!dryRun) {
      try {
        const embedding = await generateEmbedding(chunk.text);
        const sanitizedDocId = sanitizeId(chunk.docId);

        vectors.push({
          id: `vdi-doc-${sanitizedDocId}-chunk-${chunk.chunkIndex}`,
          values: embedding,
          metadata: {
            docId: `vdi-doc-${sanitizedDocId}`,
            docType: 'vdi_doc',
            title: chunk.title.slice(0, 500),
            text: chunk.text.slice(0, 8000),
            chunkIndex: chunk.chunkIndex,
            totalChunks: chunk.totalChunks,
            sourceUrl: chunk.sourceUrl,
            tier: chunk.tier,
            topics: chunk.topics.slice(0, 500),
          },
        });
      } catch (error) {
        console.log(`  Warning: Failed to embed chunk ${i}: ${error}`);
      }

      // Rate limiting: 100ms delay every 5 embeddings
      if ((i + 1) % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Upsert to Pinecone in batches
  if (!dryRun && vectors.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
      console.log(`  Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
    }
    console.log(`\nTotal vectors upserted: ${vectors.length}`);
  }

  return vectors.length;
}

async function main() {
  console.log('=== VDI Document Ingestion Script ===\n');

  // Check for --dry-run flag
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('DRY RUN MODE: Will process but not upsert to Pinecone\n');
  }

  // Check environment (not needed for dry run)
  if (!dryRun) {
    if (!process.env.PINECONE_API_KEY || !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('Missing required environment variables:');
      console.error('- PINECONE_API_KEY');
      console.error('- GOOGLE_GENERATIVE_AI_API_KEY');
      process.exit(1);
    }
  }

  // Read manifest
  const manifestPath = path.join(process.cwd(), 'data', 'vdi-content-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found at ${manifestPath}`);
    console.error('Run discover-vdi-content.ts first to generate the manifest.');
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Loaded manifest with ${manifest.items.length} items`);

  // Filter for Tier 1 and Tier 2 only
  const eligibleItems = manifest.items.filter(item => item.tier === 1 || item.tier === 2);
  console.log(`Filtering: ${eligibleItems.length} items are Tier 1 or Tier 2\n`);

  // Process each document
  const allChunks: DocumentChunk[] = [];

  for (const item of eligibleItems) {
    console.log(`\nProcessing: ${item.title} (Tier ${item.tier}, ${item.type})`);
    const chunks = await processDocument(item);
    allChunks.push(...chunks);

    // Small delay between documents to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total documents processed: ${eligibleItems.length}`);
  console.log(`Total chunks created: ${allChunks.length}`);

  if (dryRun) {
    console.log(`\n=== DRY RUN COMPLETE ===`);
    console.log(`Would ingest ${allChunks.length} chunks`);

    // Log chunks per document
    const docCounts = new Map<string, number>();
    for (const chunk of allChunks) {
      docCounts.set(chunk.title, (docCounts.get(chunk.title) || 0) + 1);
    }

    console.log(`\nChunks per document:`);
    for (const [title, count] of docCounts) {
      console.log(`  - ${title.slice(0, 60)}: ${count} chunks`);
    }

    return;
  }

  // Ingest to Pinecone
  const index = getPinecone().index(process.env.PINECONE_INDEX || 'law-agent');
  const count = await ingestDocuments(allChunks, index, dryRun);

  console.log(`\n=== Done! Total vectors added: ${count} ===`);
}

main().catch(console.error);
