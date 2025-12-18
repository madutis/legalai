import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { extractText } from 'unpdf';

dotenv.config({ path: '.env.local' });

// Config
const DATA_DIR = path.join(process.cwd(), 'data');
const INDEX_NAME = 'law-agent';
const CHUNK_SIZE = 800; // tokens (rough estimate: 4 chars per token)
const CHUNK_OVERLAP = 100;
const BATCH_SIZE = 50;

// Initialize clients
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

interface ChunkMetadata {
  docId: string;
  docType: 'legislation' | 'ruling';
  sourceFile: string;
  chunkIndex: number;
  totalChunks: number;
}

interface DocumentChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

// Get all PDF files recursively
function getPdfFiles(dir: string, basePath: string = ''): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(basePath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getPdfFiles(fullPath, relativePath));
    } else if (item.endsWith('.pdf')) {
      files.push(relativePath);
    }
  }

  return files;
}

// Extract text from PDF file using unpdf
async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    const buffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(buffer);
    const { text } = await extractText(uint8Array);
    // text can be string or array of pages
    if (Array.isArray(text)) {
      return text.join('\n\n');
    }
    return text;
  } catch (error) {
    console.error(`PDF extraction error for ${filePath}:`, error);
    return '';
  }
}

// Chunk text with overlap
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const charSize = chunkSize * 4; // rough token to char conversion
  const charOverlap = overlap * 4;

  // Clean up text
  text = text.replace(/\s+/g, ' ').trim();

  let start = 0;
  while (start < text.length) {
    let end = start + charSize;

    // Try to break at sentence or paragraph boundary
    if (end < text.length) {
      const breakPoints = ['. ', '.\n', '\n\n', '\n', ', '];
      for (const bp of breakPoints) {
        const lastBreak = text.lastIndexOf(bp, end);
        if (lastBreak > start + charSize * 0.5) {
          end = lastBreak + bp.length;
          break;
        }
      }
    }

    const chunk = text.slice(start, Math.min(end, text.length)).trim();
    if (chunk.length > 100) {
      chunks.push(chunk);
    }

    start = end - charOverlap;
    if (start >= text.length) break;
  }

  return chunks;
}

// Generate embeddings using Google's text-embedding-004
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    try {
      // Truncate text if too long (max ~8000 tokens for embedding)
      const text = texts[i].slice(0, 30000);
      const result = await model.embedContent(text);
      embeddings.push(result.embedding.values);
    } catch (error) {
      console.error(`Embedding error for chunk ${i}:`, error);
      // Push zero vector as fallback
      embeddings.push(new Array(768).fill(0));
    }

    // Rate limiting - 1 request per 100ms
    if (i < texts.length - 1) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return embeddings;
}

// Process a single document
async function processDocument(relativePath: string): Promise<DocumentChunk[]> {
  const fullPath = path.join(DATA_DIR, relativePath);
  console.log(`Processing: ${relativePath}`);

  // Extract text
  const text = await extractTextFromPdf(fullPath);
  if (!text || text.length < 100) {
    console.log(`  Skipping - no extractable text (${text.length} chars)`);
    return [];
  }

  // Determine document type
  const isRuling = relativePath.startsWith('rulings/');
  const docType: 'legislation' | 'ruling' = isRuling ? 'ruling' : 'legislation';

  // Extract doc ID from filename
  const fileName = path.basename(relativePath, '.pdf');
  const docId = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Chunk the text
  const textChunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
  console.log(`  Extracted ${text.length} chars → ${textChunks.length} chunks`);

  // Create document chunks with metadata
  const chunks: DocumentChunk[] = textChunks.map((chunk, index) => ({
    id: `${docId}-${index}`,
    text: chunk,
    metadata: {
      docId,
      docType,
      sourceFile: relativePath,
      chunkIndex: index,
      totalChunks: textChunks.length,
    },
  }));

  return chunks;
}

// Upload a batch of chunks to Pinecone
async function uploadBatch(
  chunks: DocumentChunk[],
  index: ReturnType<typeof pinecone.index>
) {
  console.log(`\n📤 Uploading batch of ${chunks.length} chunks...`);

  // Generate embeddings
  const texts = chunks.map((c) => c.text);
  const embeddings = await generateEmbeddings(texts);

  // Prepare vectors for Pinecone
  const vectors = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embeddings[i],
    metadata: {
      ...chunk.metadata,
      text: chunk.text.slice(0, 2000), // Store truncated text for retrieval
    },
  }));

  // Upsert to Pinecone in smaller batches
  const UPSERT_BATCH = 100;
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
    const batch = vectors.slice(i, i + UPSERT_BATCH);
    await index.upsert(batch);
  }
  console.log(`  ✓ Uploaded ${vectors.length} vectors`);
}

// Main ingestion function
async function ingestDocuments() {
  console.log('🚀 Starting document ingestion from local files...\n');

  const index = pinecone.index(INDEX_NAME);

  // Get all PDF files
  const pdfFiles = getPdfFiles(DATA_DIR);
  console.log(`Found ${pdfFiles.length} PDF files\n`);

  let totalChunks = 0;
  let allChunks: DocumentChunk[] = [];
  let processedFiles = 0;

  // Process each file
  for (const file of pdfFiles) {
    try {
      const chunks = await processDocument(file);
      allChunks.push(...chunks);
      totalChunks += chunks.length;
      processedFiles++;

      // Process in batches
      if (allChunks.length >= BATCH_SIZE) {
        await uploadBatch(allChunks, index);
        allChunks = [];
      }

      // Progress update
      if (processedFiles % 10 === 0) {
        console.log(`\n📊 Progress: ${processedFiles}/${pdfFiles.length} files, ${totalChunks} chunks\n`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  // Upload remaining chunks
  if (allChunks.length > 0) {
    await uploadBatch(allChunks, index);
  }

  console.log(`\n✅ Ingestion complete!`);
  console.log(`   Files processed: ${processedFiles}`);
  console.log(`   Total chunks: ${totalChunks}`);

  // Get final index stats
  try {
    const stats = await index.describeIndexStats();
    console.log(`   Vectors in index: ${stats.totalRecordCount}`);
  } catch (e) {
    // Index may still be initializing
  }
}

// Run
ingestDocuments().catch(console.error);
