/**
 * LAT Pipeline - Step 3: Ingest to Pinecone
 *
 * This script:
 * 1. Reads cases from database that haven't been vectorized
 * 2. Generates embeddings using Google's text-embedding model
 * 3. Upserts to Pinecone with case_id reference
 * 4. Tracks ingested vectors in database
 *
 * Usage:
 *   npx tsx scripts/lat/3-ingest.ts              # Ingest new cases only
 *   npx tsx scripts/lat/3-ingest.ts --all        # Re-ingest all cases
 *   npx tsx scripts/lat/3-ingest.ts --dry-run    # Show what would be ingested
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import {
  getDb,
  closeDb,
  getAllCases,
  getCasesWithoutVectors,
  getVectorByCaseId,
  insertVectors,
  deleteVectorByCaseId,
  getStats,
  type LatCase,
  type LatVectorInput,
} from '../../src/lib/db';

dotenv.config({ path: '.env.local' });

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  INDEX_NAME: 'law-agent',
  EMBEDDING_MODEL: 'text-embedding-004',
  BATCH_SIZE: 20,
  RATE_LIMIT_DELAY_MS: 200,
};

// ============================================================================
// Initialize Clients
// ============================================================================

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Build text for embedding - combines key fields for semantic search
 */
function buildEmbeddingText(c: LatCase): string {
  const parts = [
    'LAT teismų praktika. Darbo teisė.',
    c.case_number ? `Byla Nr. ${c.case_number}.` : '',
    c.title,
    c.summary,
    // Include first part of full text for additional context
    c.full_text.slice(0, 1500),
  ];
  return parts.filter(Boolean).join(' ');
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: CONFIG.EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Generate embeddings for multiple texts (with rate limiting)
 */
async function generateEmbeddings(
  cases: LatCase[]
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>();

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const text = buildEmbeddingText(c);

    try {
      const embedding = await generateEmbedding(text);
      embeddings.set(c.id, embedding);

      if (i < cases.length - 1) {
        await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
      }
    } catch (error) {
      console.log(`      ⚠ Failed to embed ${c.id}: ${(error as Error).message}`);
    }
  }

  return embeddings;
}

// ============================================================================
// Pinecone Operations
// ============================================================================

/**
 * Upsert vectors to Pinecone
 */
async function upsertToPinecone(
  cases: LatCase[],
  embeddings: Map<string, number[]>
): Promise<number> {
  const index = pinecone.index(CONFIG.INDEX_NAME);
  const vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, string | number | boolean>;
  }> = [];

  for (const c of cases) {
    const embedding = embeddings.get(c.id);
    if (!embedding) continue;

    vectors.push({
      id: c.id,
      values: embedding,
      metadata: {
        // Minimal metadata - full data is in SQLite
        docId: c.id,
        docType: 'lat_ruling',
        caseNumber: c.case_number || '',
        pdfId: c.pdf_id,
        // Include title and summary for display in search results
        title: c.title.slice(0, 200),
        summary: c.summary.slice(0, 500),
      },
    });
  }

  // Batch upsert
  let upserted = 0;
  for (let i = 0; i < vectors.length; i += CONFIG.BATCH_SIZE) {
    const batch = vectors.slice(i, i + CONFIG.BATCH_SIZE);
    await index.upsert(batch);
    upserted += batch.length;
    console.log(`      Upserted batch: ${upserted}/${vectors.length}`);
  }

  return upserted;
}

/**
 * Delete vectors from Pinecone
 */
async function deleteFromPinecone(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const index = pinecone.index(CONFIG.INDEX_NAME);
  await index.deleteMany(ids);
}

// ============================================================================
// Utility Functions
// ============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Main Pipeline
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const processAll = args.includes('--all');
  const dryRun = args.includes('--dry-run');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  LAT Pipeline - Step 3: Ingest to Pinecone');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (dryRun) {
    console.log('🔸 DRY RUN MODE - No changes will be made\n');
  }

  // Initialize database
  console.log('📂 Initializing...');
  getDb();
  const initialStats = getStats();
  console.log(`   Cases in DB: ${initialStats.cases.total}`);
  console.log(`   Vectors in DB: ${initialStats.vectors}\n`);

  // Determine which cases to ingest
  let casesToIngest: LatCase[] = [];

  if (processAll) {
    casesToIngest = getAllCases().filter((c) => c.is_labor_law);
    console.log(`📋 Re-ingesting ALL ${casesToIngest.length} labor law cases\n`);

    if (!dryRun && casesToIngest.length > 0) {
      // Delete existing vectors from Pinecone
      console.log('🗑️  Removing existing vectors from Pinecone...');
      const existingIds = casesToIngest
        .map((c) => getVectorByCaseId(c.id))
        .filter(Boolean)
        .map((v) => v!.vector_id);
      if (existingIds.length > 0) {
        await deleteFromPinecone(existingIds);
        // Delete from DB
        for (const c of casesToIngest) {
          deleteVectorByCaseId(c.id);
        }
        console.log(`   Deleted ${existingIds.length} existing vectors\n`);
      }
    }
  } else {
    casesToIngest = getCasesWithoutVectors();
    console.log(`📋 Ingesting ${casesToIngest.length} new cases\n`);
  }

  if (casesToIngest.length === 0) {
    console.log('✅ No cases to ingest. Run step 2 first or use --all to re-ingest.\n');
    closeDb();
    return;
  }

  // Show what will be ingested
  console.log('📥 Cases to ingest:');
  for (const c of casesToIngest.slice(0, 10)) {
    console.log(`   - ${c.id} (${c.case_number || 'no case number'})`);
  }
  if (casesToIngest.length > 10) {
    console.log(`   ... and ${casesToIngest.length - 10} more`);
  }
  console.log();

  if (dryRun) {
    console.log('🔸 Dry run complete. Use without --dry-run to ingest.\n');
    closeDb();
    return;
  }

  // Generate embeddings
  console.log('🔢 Generating embeddings...');
  const embeddings = await generateEmbeddings(casesToIngest);
  console.log(`   Generated ${embeddings.size} embeddings\n`);

  // Upsert to Pinecone
  console.log('📤 Upserting to Pinecone...');
  const upserted = await upsertToPinecone(casesToIngest, embeddings);
  console.log(`   Upserted ${upserted} vectors\n`);

  // Track in database
  console.log('💾 Recording in database...');
  const vectorRecords: LatVectorInput[] = [];
  for (const c of casesToIngest) {
    if (embeddings.has(c.id)) {
      vectorRecords.push({
        case_id: c.id,
        vector_id: c.id, // Using same ID for simplicity
        embedding_model: CONFIG.EMBEDDING_MODEL,
      });
    }
  }
  if (vectorRecords.length > 0) {
    insertVectors(vectorRecords);
  }
  console.log(`   Recorded ${vectorRecords.length} vector entries\n`);

  // Final report
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Ingestion Complete');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const finalStats = getStats();
  console.log('📊 Results:');
  console.log(`   Embeddings generated: ${embeddings.size}`);
  console.log(`   Vectors upserted: ${upserted}`);
  console.log();
  console.log('📊 Database totals:');
  console.log(`   Total cases: ${finalStats.cases.total}`);
  console.log(`   Total vectors: ${finalStats.vectors}`);
  console.log();

  closeDb();
  console.log('✅ Step 3 complete. Cases are now searchable in Pinecone.\n');
}

// ============================================================================
// Run
// ============================================================================

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  closeDb();
  process.exit(1);
});
