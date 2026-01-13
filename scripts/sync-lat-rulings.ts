/**
 * LAT Rulings Sync Script
 *
 * Automatically syncs LAT (Lithuanian Supreme Court) monthly practice bulletins:
 * 1. Scrapes lat.lt index page for PDF links
 * 2. Downloads new PDFs (compares with sync state)
 * 3. Extracts "Darbo teisė" (Labor Law) sections
 * 4. Parses individual cases with case numbers and page references
 * 5. Generates AI summaries
 * 6. Stores in Pinecone with links to original PDFs
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractText } from 'unpdf';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const LAT_INDEX_URL = 'https://www.lat.lt/teismu-praktika/lat-praktika/kasmenesines-lat-praktikos-apzvalgos-nuo-2015-m./61';
const LAT_BASE_URL = 'https://www.lat.lt';
const SYNC_STATE_FILE = path.join(process.cwd(), 'data', 'lat-sync-state.json');
const INDEX_NAME = 'law-agent';
const BATCH_SIZE = 20;

// Initialize clients
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

interface PdfInfo {
  url: string;
  filename: string;
  year: string;
  month: string;
}

interface ParsedCase {
  caseNumber: string | null;
  caseTitle: string;
  content: string;
  pageNumber: number;
}

interface SyncState {
  lastSync: string;
  processedFiles: string[];
}

interface CaseVector {
  id: string;
  caseNumber: string | null;
  caseTitle: string;
  caseSummary: string;
  content: string;
  sourceUrl: string;
  sourcePage: number;
  year: string;
  month: string;
}

// Load or initialize sync state
function loadSyncState(): SyncState {
  try {
    if (fs.existsSync(SYNC_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(SYNC_STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.log('Could not load sync state, starting fresh');
  }
  return { lastSync: '', processedFiles: [] };
}

function saveSyncState(state: SyncState): void {
  const dir = path.dirname(SYNC_STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(state, null, 2));
}

// Scrape lat.lt index page for PDF links
async function scrapePdfLinks(): Promise<PdfInfo[]> {
  console.log('Fetching LAT index page...');
  const response = await fetch(LAT_INDEX_URL);
  const html = await response.text();

  const pdfLinks: PdfInfo[] = [];
  const regex = /href="(\/data\/public\/uploads\/[^"]+\.pdf)"/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const url = LAT_BASE_URL + match[1];
    const filename = path.basename(match[1]);

    // Parse year and month from filename
    // Pattern: lat_aktuali_praktika_month_year.pdf
    const yearMatch = filename.match(/(\d{4})\.pdf$/);
    const monthMatch = filename.match(/praktika[_-]([a-z-]+)_\d{4}/i);

    if (yearMatch) {
      pdfLinks.push({
        url,
        filename,
        year: yearMatch[1],
        month: monthMatch ? monthMatch[1] : 'unknown',
      });
    }
  }

  console.log(`Found ${pdfLinks.length} PDF links`);
  return pdfLinks;
}

// Download PDF and extract text with page information
async function downloadAndExtract(url: string): Promise<{ text: string; pageTexts: string[] }> {
  console.log(`Downloading: ${url}`);
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  const { text, totalPages } = await extractText(new Uint8Array(buffer), { mergePages: true });

  // Also get per-page text for page number detection
  const pageTexts: string[] = [];
  for (let i = 1; i <= totalPages; i++) {
    try {
      const pageResult = await extractText(new Uint8Array(buffer), {
        mergePages: false,
      });
      // unpdf returns pages differently, let's estimate from merged text
    } catch (e) {
      // Fallback
    }
  }

  // Split text by page markers if available, otherwise estimate
  const pages = text.split(/\n\s*\d+\s*\n/).filter(p => p.trim().length > 100);

  return { text, pageTexts: pages.length > 1 ? pages : [text] };
}

// Extract "Darbo teisė" section from full text
function extractDarboTeiseSection(text: string): { content: string; startPage: number } | null {
  // Find "Darbo teisė" header - can be preceded by page number
  // Pattern: optional page number + "Darbo teisė" + NOT followed by dots (TOC)
  const sectionHeaderPattern = /(?:\d+\s+)?(Darbo\s+teis[ėe])\s+(?!\.)/gi;
  let darboTeiseMatch = null;
  let match;

  while ((match = sectionHeaderPattern.exec(text)) !== null) {
    const beforeChars = text.slice(Math.max(0, match.index - 100), match.index);
    const afterChars = text.slice(match.index + match[0].length, match.index + match[0].length + 50);

    // Skip if this looks like TOC (followed by dots and page number, or preceded by TOC context)
    if (afterChars.match(/^\.{3,}/) || beforeChars.match(/\.{10,}\s*\d*$/)) {
      continue;
    }

    // This looks like the real section header
    darboTeiseMatch = match;
    break;
  }

  if (!darboTeiseMatch) {
    return null;
  }

  const startIndex = darboTeiseMatch.index;

  // Find next section header (may be preceded by page number)
  const nextSectionPattern = /(?:\d+\s+)?(?:Prievolių|Daiktinė|Sutarčių|Šeimos|Paveldėjimo|Civilinio proceso|Nemokumo|Intelektinės|Draudimo|Konkurencijos|Bendrovių|Bankroto|Mokesčių|Sandoriai|Atstovavimas)\s+teis[ėe]\s+(?!\.)|(?:\d+\s+)?(?:Viešieji pirkimai|Viešųjų pirkimų|Procesinė teisė|Proceso teisė|Įmonių teisė)\s+(?!\.)/gi;

  nextSectionPattern.lastIndex = startIndex + darboTeiseMatch[0].length;
  const nextSectionMatch = nextSectionPattern.exec(text);

  const endIndex = nextSectionMatch ? nextSectionMatch.index : text.length;
  const content = text.slice(startIndex, endIndex).trim();

  // Estimate page number (rough: ~3000 chars per page)
  const startPage = Math.floor(startIndex / 3000) + 1;

  return { content, startPage };
}

// Use LLM to parse individual cases from Darbo teisė section
async function parseCasesWithLLM(sectionContent: string, basePageNumber: number): Promise<ParsedCase[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Esi Lietuvos teisės ekspertas. Tau pateiktas LAT (Lietuvos Aukščiausiojo Teismo) praktikos apžvalgos "Darbo teisė" skyrius.

Išanalizuok tekstą ir surask visas atskiras bylas/nutartis. Kiekvienai bylai nurodyk:
1. Bylos numerį (pvz., "e3K-3-176-684/2024" arba "3K-3-123-456/2023")
2. Trumpą pavadinimą (ką byla nagrinėja, pradedant "Dėl...")
3. Bylos turinį (visą tekstą apie šią bylą)

Jei bylų numerių nėra, nurodyk "null".

SVARBU: Grąžink JSON formatu, be jokio papildomo teksto:
[
  {
    "caseNumber": "e3K-3-176-684/2024" arba null,
    "caseTitle": "Dėl darbuotojo atleidimo...",
    "content": "Visas bylos tekstas..."
  }
]

Jei tekste nėra atskirų bylų, grąžink vieną įrašą su visu skyriaus turiniu.

TEKSTAS:
${sectionContent.slice(0, 15000)}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('    LLM did not return valid JSON, using fallback');
      return fallbackParseCases(sectionContent, basePageNumber);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((c: any, i: number) => ({
      caseNumber: c.caseNumber || null,
      caseTitle: (c.caseTitle || 'Darbo teisės praktika').slice(0, 200),
      content: c.content || sectionContent,
      pageNumber: basePageNumber + Math.floor((i * sectionContent.length / parsed.length) / 3000),
    }));
  } catch (error) {
    console.log('    LLM parsing failed, using fallback:', error);
    return fallbackParseCases(sectionContent, basePageNumber);
  }
}

// Fallback regex-based parsing
function fallbackParseCases(sectionContent: string, basePageNumber: number): ParsedCase[] {
  // Try to extract any case number from the section
  const caseNumberMatch = sectionContent.match(/(?:Nr\.\s*)?([eE]?[0-9A-Z]+-\d+-\d+-\d+\/\d{4})/);

  // Get first meaningful text as title
  const cleanContent = sectionContent.replace(/^\d+\s+Darbo\s+teis[ėe]\s*/i, '').trim();
  const firstPart = cleanContent.slice(0, 200).split(/[.!?]/)[0] || 'Darbo teisės praktika';

  return [{
    caseNumber: caseNumberMatch ? caseNumberMatch[1] : null,
    caseTitle: firstPart.trim(),
    content: sectionContent,
    pageNumber: basePageNumber,
  }];
}

// Generate AI summary for a case
async function generateCaseSummary(caseContent: string, caseTitle: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Esi Lietuvos darbo teisės ekspertas. Pateikta LAT (Lietuvos Aukščiausiojo Teismo) nutartis darbo teisės klausimu.

Nutarties turinys:
${caseContent.slice(0, 4000)}

Parašyk 1-2 sakinių santrauką, kuri:
1. Nurodo pagrindinį ginčo objektą
2. Nurodo teismo išaiškinimą ar sprendimą
3. Jei aktualu, nurodo Darbo kodekso straipsnius (DK X str.)

Rašyk tik santrauką, be įžangos. Maksimum 200 žodžių.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Summary generation failed:', error);
    return `Byla dėl: ${caseTitle}`;
  }
}

// Generate embedding
async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// Delete old LAT vectors from Pinecone
async function deleteOldVectors(): Promise<void> {
  console.log('Deleting old LAT ruling vectors...');
  const index = pinecone.index(INDEX_NAME);

  // Query for all ruling vectors
  const queries = [];
  for (let i = 0; i < 50; i++) {
    const randomVector = Array(768).fill(0).map(() => Math.random() * 2 - 1);
    queries.push(
      index.query({
        vector: randomVector,
        topK: 100,
        filter: { docType: 'ruling' },
        includeMetadata: false,
      })
    );
  }

  const results = await Promise.all(queries);
  const idsToDelete = new Set<string>();

  for (const result of results) {
    for (const match of result.matches || []) {
      idsToDelete.add(match.id);
    }
  }

  if (idsToDelete.size > 0) {
    console.log(`Deleting ${idsToDelete.size} old vectors...`);
    const idArray = [...idsToDelete];
    for (let i = 0; i < idArray.length; i += 100) {
      await index.deleteMany(idArray.slice(i, i + 100));
    }
  }
}

// Main sync function
async function syncLatRulings(forceResync: boolean = false): Promise<void> {
  console.log('=== LAT Rulings Sync ===\n');

  // Load state
  let state = loadSyncState();
  if (forceResync) {
    console.log('Force resync - clearing state');
    state = { lastSync: '', processedFiles: [] };
    await deleteOldVectors();
  }

  // Scrape PDF links
  const pdfLinks = await scrapePdfLinks();

  // Filter to new files only
  const newPdfs = pdfLinks.filter(pdf => !state.processedFiles.includes(pdf.filename));
  console.log(`\nNew PDFs to process: ${newPdfs.length}`);

  if (newPdfs.length === 0) {
    console.log('No new PDFs found. Sync complete.');
    return;
  }

  const index = pinecone.index(INDEX_NAME);
  const allCases: CaseVector[] = [];

  // Process each new PDF
  for (const pdf of newPdfs) {
    console.log(`\n--- Processing: ${pdf.filename} ---`);

    try {
      // Download and extract
      const { text } = await downloadAndExtract(pdf.url);

      // Extract Darbo teisė section
      const section = extractDarboTeiseSection(text);
      if (!section) {
        console.log('No "Darbo teisė" section found, skipping');
        state.processedFiles.push(pdf.filename);
        continue;
      }

      console.log(`Found Darbo teisė section (~${section.content.length} chars)`);

      // Parse individual cases using LLM
      const cases = await parseCasesWithLLM(section.content, section.startPage);
      console.log(`Parsed ${cases.length} cases`);

      // Generate summaries and prepare vectors
      for (let i = 0; i < cases.length; i++) {
        const c = cases[i];
        console.log(`  Case ${i + 1}: ${c.caseNumber || 'no number'} - ${c.caseTitle.slice(0, 50)}...`);

        // Generate summary
        const summary = await generateCaseSummary(c.content, c.caseTitle);

        // Create vector ID
        const docId = pdf.filename.replace('.pdf', '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const vectorId = `${docId}-case-${i}`;

        allCases.push({
          id: vectorId,
          caseNumber: c.caseNumber,
          caseTitle: c.caseTitle,
          caseSummary: summary,
          content: c.content,
          sourceUrl: pdf.url,
          sourcePage: c.pageNumber,
          year: pdf.year,
          month: pdf.month,
        });

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      }

      state.processedFiles.push(pdf.filename);
      saveSyncState(state);

    } catch (error) {
      console.error(`Error processing ${pdf.filename}:`, error);
    }
  }

  // Generate embeddings and upsert to Pinecone
  if (allCases.length > 0) {
    console.log(`\n--- Upserting ${allCases.length} cases to Pinecone ---`);

    const vectors = [];
    for (const c of allCases) {
      // Create embedding text with context
      const embeddingText = `LAT teismų praktika. Darbo teisė. ${c.caseTitle}. ${c.caseSummary}. ${c.content.slice(0, 2000)}`;
      const embedding = await generateEmbedding(embeddingText);

      vectors.push({
        id: c.id,
        values: embedding,
        metadata: {
          docId: c.id,
          docType: 'ruling' as const,
          sourceUrl: c.sourceUrl,
          sourcePage: c.sourcePage,
          caseNumber: c.caseNumber || '',
          caseTitle: c.caseTitle,
          caseSummary: c.caseSummary,
          year: c.year,
          month: c.month,
          section: 'darbo_teise',
          // Store truncated text for context (Pinecone limit)
          text: c.content.slice(0, 3500),
        },
      });

      // Batch upsert
      if (vectors.length >= BATCH_SIZE) {
        await index.upsert(vectors);
        console.log(`Upserted batch of ${vectors.length} vectors`);
        vectors.length = 0;
      }
    }

    // Final batch
    if (vectors.length > 0) {
      await index.upsert(vectors);
      console.log(`Upserted final batch of ${vectors.length} vectors`);
    }
  }

  // Update state
  state.lastSync = new Date().toISOString();
  saveSyncState(state);

  console.log(`\n=== Sync Complete ===`);
  console.log(`Processed: ${newPdfs.length} PDFs`);
  console.log(`Total cases: ${allCases.length}`);
  console.log(`State saved to: ${SYNC_STATE_FILE}`);
}

// CLI
const args = process.argv.slice(2);
const forceResync = args.includes('--force') || args.includes('-f');

syncLatRulings(forceResync).catch(console.error);
