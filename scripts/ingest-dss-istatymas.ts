/**
 * Ingest DSS Įstatymas (Darbuotojų saugos ir sveikatos įstatymas - Occupational Safety and Health Act)
 *
 * Fetches latest consolidated version from e-TAR and ingests articles to Pinecone.
 *
 * Usage:
 *   npx tsx scripts/ingest-dss-istatymas.ts --dry-run   # Parse and show articles without ingesting
 *   npx tsx scripts/ingest-dss-istatymas.ts             # Full ingestion to Pinecone
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// e-TAR document identifiers for DSS Įstatymas (IX-1672)
const ETAR_DOC_ID = '95C79D036AA4';
const ETAR_BASE_URL = 'https://www.e-tar.lt';
const ASR_URL = `${ETAR_BASE_URL}/portal/lt/legalAct/TAR.${ETAR_DOC_ID}/asr`;

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

interface Article {
  num: number;
  title: string;
  text: string;
}

/**
 * Fetch the latest edition ID from e-TAR
 */
async function getLatestEditionId(): Promise<{ editionId: string; effectiveDate: string }> {
  console.log('Fetching latest edition ID from e-TAR...');

  const response = await fetch(ASR_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch e-TAR page: ${response.status}`);
  }

  const html = await response.text();

  // Extract edition ID from the page
  const idMatch = html.match(/actualEditionId=([^"&]+)/);
  if (!idMatch) {
    throw new Error('Could not find edition ID in e-TAR page');
  }

  // Extract effective date range
  const dateMatch = html.match(/Galiojanti suvestinė redakcija[^[]*\[(\d{4}-\d{2}-\d{2})/);
  const effectiveDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

  return { editionId: idMatch[1], effectiveDate };
}

/**
 * Download DOCX from e-TAR
 */
async function downloadDocx(editionId: string): Promise<Buffer> {
  const url = `${ETAR_BASE_URL}/rs/actualedition/TAR.${ETAR_DOC_ID}/${editionId}/format/MSO2010_DOCX/`;
  console.log(`Downloading DOCX from: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download DOCX: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Clean article text by removing amendment history noise
 */
function cleanArticleText(text: string): string {
  const patterns = [
    /Straipsnio (?:dalies |punkto )?pakeitimai:\s*\nNr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
    /Straipsnio dalies numeracijos pakeitimas:\s*\nNr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
    /Papildyta straipsnio dalimi:\s*\nNr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
    /Pakeistas straipsnio pavadinimas:\s*\nNr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
    /Neteko galios nuo [\d-]+:\s*\nNr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
    /Nr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
  ];

  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '\n');
  }

  // Remove trailing section headers that leaked from next article
  cleaned = cleaned.replace(/\n[A-ZĄČĘĖĮŠŲŪŽ]+\s+(?:SKIRSNIS|SKYRIUS|DALIS)\s*\n[A-ZĄČĘĖĮŠŲŪŽ\s]+$/g, '');
  cleaned = cleaned.replace(/\n[IVX]+\s+SKYRIUS\s*\n[A-ZĄČĘĖĮŠŲŪŽ\s]+$/g, '');

  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Parse DOCX and extract articles
 */
async function parseDocx(buffer: Buffer): Promise<Article[]> {
  console.log('Parsing DOCX...');

  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  console.log(`Extracted ${text.length} characters`);

  // Clean up text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');

  // Extract articles - pattern: "N straipsnis. Title"
  const articlePattern = /(?:^|\n)\s*(\d+)\s*straipsnis\.?\s+([A-ZĄČĘĖĮŠŲŪŽ][^\n]*)/g;
  const rawMatches: { num: number; title: string; start: number }[] = [];

  let match;
  while ((match = articlePattern.exec(cleanedText)) !== null) {
    const num = parseInt(match[1]);
    const title = match[2].trim().replace(/\s+/g, ' ');

    // DSS Įstatymas has about 50 articles
    if (num >= 1 && num <= 60 && title.length > 3 && !/^[)\].,;:]/.test(title)) {
      rawMatches.push({ num, title, start: match.index });
    }
  }

  // Deduplicate by article number (keep first occurrence)
  const seen = new Set<number>();
  const uniqueMatches = rawMatches.filter(m => {
    if (seen.has(m.num)) return false;
    seen.add(m.num);
    return true;
  });

  // Build articles
  const articles: Article[] = [];
  for (let i = 0; i < uniqueMatches.length; i++) {
    const artMatch = uniqueMatches[i];
    const start = artMatch.start;
    const end = i < uniqueMatches.length - 1 ? uniqueMatches[i + 1].start : cleanedText.length;
    let articleText = cleanedText.slice(start, end).trim();

    // Clean up article text
    articleText = articleText
      .replace(/\n{2,}/g, '\n\n')
      .replace(/^\s+/gm, '')
      .trim();

    // Remove amendment history noise
    articleText = cleanArticleText(articleText);

    if (articleText.length < 50) continue;

    articles.push({
      num: artMatch.num,
      title: artMatch.title,
      text: articleText,
    });
  }

  articles.sort((a, b) => a.num - b.num);
  return articles;
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text.slice(0, 30000));
  return result.embedding.values;
}

/**
 * Ingest articles to Pinecone
 */
async function ingestToPinecone(articles: Article[]): Promise<number> {
  console.log(`\nIngesting ${articles.length} articles to Pinecone...`);

  const index = getPinecone().index(process.env.PINECONE_INDEX || 'law-agent');

  const vectors: any[] = [];

  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];

    // Build rich text for embedding
    const textForEmbed = `DSS įstatymas ${art.num} straipsnis: ${art.title}\n\n${art.text}`;

    try {
      const embedding = await generateEmbedding(textForEmbed);
      vectors.push({
        id: `dss-istatymas-str-${art.num}`,
        values: embedding,
        metadata: {
          docId: `dss-str-${art.num}`,
          docType: 'legislation',
          lawCode: 'DSS',
          articleNumber: art.num,
          articleTitle: art.title,
          text: art.text.slice(0, 8000),
          sourceUrl: 'https://www.e-tar.lt/portal/lt/legalAct/TAR.95C79D036AA4/asr',
          chunkIndex: 0,
          totalChunks: 1,
        },
      });

      if ((i + 1) % 10 === 0) {
        console.log(`  Embedded ${i + 1}/${articles.length} articles`);
      }

      // Rate limiting: 100ms delay every 5 embeddings
      if ((i + 1) % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.log(`  Warning: Failed to embed article ${art.num}: ${err}`);
    }
  }

  // Upsert to Pinecone in batches
  if (vectors.length > 0) {
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
  console.log('=== DSS Įstatymas Ingestion Script ===\n');

  // Check for --dry-run flag
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('DRY RUN MODE: Will parse but not ingest to Pinecone\n');
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

  // 1. Get latest edition
  const { editionId, effectiveDate } = await getLatestEditionId();
  console.log(`Edition: ${editionId}, Effective: ${effectiveDate}\n`);

  // 2. Download DOCX
  const docxBuffer = await downloadDocx(editionId);
  console.log(`Downloaded ${(docxBuffer.length / 1024).toFixed(1)} KB\n`);

  // 3. Parse and extract articles
  const articles = await parseDocx(docxBuffer);
  console.log(`\nExtracted ${articles.length} articles`);

  // Show sample articles
  console.log('\nSample articles:');
  for (const art of articles.slice(0, 5)) {
    console.log(`  Art ${art.num}: ${art.title.slice(0, 60)}... (${art.text.length} chars)`);
  }

  // Show last few articles
  console.log('  ...');
  for (const art of articles.slice(-3)) {
    console.log(`  Art ${art.num}: ${art.title.slice(0, 60)}... (${art.text.length} chars)`);
  }

  if (dryRun) {
    console.log('\n=== DRY RUN COMPLETE ===');
    console.log(`Would ingest ${articles.length} articles with lawCode=DSS`);
    console.log('\nArticle metadata sample:');
    if (articles.length > 0) {
      const sample = articles[0];
      console.log(`  id: dss-istatymas-str-${sample.num}`);
      console.log(`  docId: dss-str-${sample.num}`);
      console.log(`  docType: legislation`);
      console.log(`  lawCode: DSS`);
      console.log(`  articleNumber: ${sample.num}`);
      console.log(`  articleTitle: ${sample.title}`);
    }
    return;
  }

  // 4. Ingest to Pinecone
  const count = await ingestToPinecone(articles);

  console.log(`\n=== Done! Total DSS articles added: ${count} ===`);
}

main().catch(console.error);
