import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { extractText } from 'unpdf';

dotenv.config({ path: '.env.local' });

const RULINGS_DIR = path.join(process.cwd(), 'data', 'rulings');
const INDEX_NAME = 'law-agent';
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const BATCH_SIZE = 50;

// Extensive list of employment law keywords in Lithuanian
const EMPLOYMENT_KEYWORDS = [
  // Core employment terms
  'darbo sutart',
  'darbo santyk',
  'darbo teis',
  'darbo kodeks',
  'darbdav',
  'darbuotoj',
  'įdarbin',
  'atleid',
  'atleist',

  // Contract types
  'terminuot',
  'neterminuot',
  'darbo vieta',
  'darbo funkcij',
  'pareig',

  // Termination
  'nutrauk',
  'pasibaig',
  'įspėjim',
  'išeitin',
  'atleidim',
  'darbo sutarties nutrauk',

  // Leave and time off
  'atostog',
  'nedarbingum',
  'liga',
  'nėštum',
  'gimdym',
  'vaiko priežiūr',
  'tėvystės',
  'motinystės',

  // Working time
  'darbo laik',
  'viršvaland',
  'naktinis darb',
  'pamain',
  'poilsio laik',
  'pertrauk',
  'budėjim',

  // Wages and compensation
  'darbo užmokest',
  'atlyginim',
  'alg',
  'priemok',
  'priedai',
  'premij',
  'kompensacij',
  'išmok',
  'vidutinis darbo užmokest',

  // Discrimination and rights
  'diskriminacij',
  'lygios galimyb',
  'mobbing',
  'priekabiaiv',
  'seksualin',
  'lygi',

  // Collective relations
  'profesinė sąjung',
  'kolektyvin',
  'darbo taryb',
  'streik',
  'lokaut',

  // Safety and health
  'darbuotojų saug',
  'sveikatos',
  'nelaimingo atsitikimo',
  'profesinė lig',

  // Disputes
  'darbo ginč',
  'darbo ginčų komisij',
  'DGK',

  // Material liability
  'materialinė atsakomyb',
  'žalos atlygini',

  // Specific Labor Code references
  'DK ',
  'Darbo kodekso',

  // Common phrases in employment cases
  'darbo drausm',
  'drausminė nuobaud',
  'drausminė atsakomyb',
  'prastov',
  'nušalinim',
  'perkėlim',
  'išbandym',
  'konkurencijos ribojim',
  'nekonkuravim',
  'konfidencial',
  'komercinė paslaptis',

  // Employment relationship indicators
  'priėmim',
  'pavaldžiai',
  'subordinacij',
  'vadov',

  // Specific worker categories
  'neįgal',
  'jaunuol',
  'nepilnamet',
  'pensinink',
  'senatvės',

  // Remote work
  'nuotolin',
  'distancin',

  // Business transfers
  'verslo perdavim',
  'reorganizacij',
  'likvidavim',
  'bankrot',

  // Additional terms from Labor Code
  'susitarim',
  'įsipareigojim',
  'teisėtas atleidim',
  'neteisėtas atleidim',
  'grąžinim į darb',
  'atkūrim',
];

// Create regex pattern for keyword matching (case insensitive)
const keywordPattern = new RegExp(
  EMPLOYMENT_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i'
);

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    const buffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(buffer);
    const { text } = await extractText(uint8Array);
    if (Array.isArray(text)) {
      return text.join('\n\n');
    }
    return text;
  } catch (error) {
    console.error(`PDF extraction error for ${filePath}:`, error);
    return '';
  }
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const charSize = chunkSize * 4;
  const charOverlap = overlap * 4;

  text = text.replace(/\s+/g, ' ').trim();

  let start = 0;
  while (start < text.length) {
    let end = start + charSize;

    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + charSize / 2) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - charOverlap;
  }

  return chunks.filter(c => c.length > 50);
}

function isEmploymentRelated(text: string): boolean {
  return keywordPattern.test(text);
}

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function deleteExistingLatRulings() {
  const index = pinecone.index(INDEX_NAME);

  console.log('Finding existing LAT rulings to delete...');

  // Query to find all LAT entries
  const allLatIds: string[] = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const query = await index.query({
      vector: new Array(768).fill(0.01 + offset * 0.001),
      topK: 100,
      includeMetadata: false
    });

    const latIds = query.matches?.filter(m => m.id.includes('LAT')).map(m => m.id) || [];

    if (latIds.length === 0) {
      hasMore = false;
    } else {
      allLatIds.push(...latIds);
      offset++;

      if (offset > 100) {
        hasMore = false; // Safety limit
      }
    }
  }

  // Remove duplicates
  const uniqueIds = [...new Set(allLatIds)];
  console.log(`Found ${uniqueIds.length} existing LAT entries to delete`);

  if (uniqueIds.length > 0) {
    // Delete in batches of 100
    for (let i = 0; i < uniqueIds.length; i += 100) {
      const batch = uniqueIds.slice(i, i + 100);
      await index.deleteMany(batch);
      console.log(`Deleted batch ${Math.floor(i/100) + 1}/${Math.ceil(uniqueIds.length/100)}`);
    }
  }
}

async function main() {
  console.log('=== Re-ingesting LAT Rulings (Employment Only) ===\n');
  console.log(`Keywords: ${EMPLOYMENT_KEYWORDS.length} employment-related terms`);

  // Delete existing LAT rulings
  await deleteExistingLatRulings();

  // Get all LAT PDF files
  const files = fs.readdirSync(RULINGS_DIR)
    .filter(f => f.endsWith('.pdf') && f.startsWith('LAT_'))
    .sort();

  console.log(`\nFound ${files.length} LAT ruling files`);

  const index = pinecone.index(INDEX_NAME);
  let totalChunks = 0;
  let employmentChunks = 0;
  let pendingVectors: any[] = [];

  for (const file of files) {
    const filePath = path.join(RULINGS_DIR, file);
    console.log(`\nProcessing: ${file}`);

    const text = await extractTextFromPdf(filePath);
    if (!text) {
      console.log('  - Failed to extract text, skipping');
      continue;
    }

    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
    totalChunks += chunks.length;

    // Filter for employment-related chunks
    const employmentRelatedChunks = chunks.filter(isEmploymentRelated);
    employmentChunks += employmentRelatedChunks.length;

    console.log(`  - ${chunks.length} total chunks, ${employmentRelatedChunks.length} employment-related`);

    if (employmentRelatedChunks.length === 0) {
      continue;
    }

    // Generate embeddings and prepare vectors
    const docId = file.replace('.pdf', '').replace(/[^a-zA-Z0-9_-]/g, '_');

    for (let i = 0; i < employmentRelatedChunks.length; i++) {
      const chunk = employmentRelatedChunks[i];

      try {
        const embedding = await generateEmbedding(chunk);

        pendingVectors.push({
          id: `${docId}-empl-${i}`,
          values: embedding,
          metadata: {
            docId,
            docType: 'ruling',
            sourceFile: `rulings/${file}`,
            chunkIndex: i,
            totalChunks: employmentRelatedChunks.length,
            text: chunk,
            isEmploymentFiltered: true,
          }
        });

        // Upsert in batches
        if (pendingVectors.length >= BATCH_SIZE) {
          await index.upsert(pendingVectors);
          console.log(`  - Upserted batch of ${pendingVectors.length} vectors`);
          pendingVectors = [];
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 100));
      } catch (error) {
        console.error(`  - Error embedding chunk ${i}:`, error);
      }
    }
  }

  // Upsert remaining vectors
  if (pendingVectors.length > 0) {
    await index.upsert(pendingVectors);
    console.log(`Upserted final batch of ${pendingVectors.length} vectors`);
  }

  console.log('\n=== Summary ===');
  console.log(`Total chunks processed: ${totalChunks}`);
  console.log(`Employment-related chunks: ${employmentChunks}`);
  console.log(`Filtering rate: ${((1 - employmentChunks/totalChunks) * 100).toFixed(1)}% filtered out`);
}

main().catch(console.error);
