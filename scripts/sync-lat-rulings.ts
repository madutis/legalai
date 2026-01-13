/**
 * LAT Rulings Sync Script v2.0
 *
 * High-quality extraction pipeline for LAT (Lithuanian Supreme Court) rulings:
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Phase 1: PDF Discovery & Download                                   │
 * │   - Scrape lat.lt index for PDF links                              │
 * │   - Compare with sync state, download new PDFs                     │
 * └─────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Phase 2: Section Extraction                                         │
 * │   - Extract "Darbo teisė" section with page tracking               │
 * │   - Handle TOC vs actual content distinction                       │
 * └─────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Phase 3: Case Boundary Detection (LLM)                             │
 * │   - Use LLM to identify individual case boundaries                 │
 * │   - Split section into separate case blocks                        │
 * │   - Process full content (chunked if needed)                       │
 * └─────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Phase 4: Case Number Extraction (Regex + Validation)               │
 * │   - Multiple regex patterns for different case number formats      │
 * │   - Strict validation against known patterns                       │
 * │   - Fallback: LLM extraction if regex fails                        │
 * └─────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Phase 5: Metadata Generation (LLM)                                 │
 * │   - Generate case title (what the case is about)                   │
 * │   - Generate AI summary with key legal points                      │
 * └─────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Phase 6: Quality Validation                                        │
 * │   - Verify case number format                                      │
 * │   - Check for duplicates                                           │
 * │   - Generate quality report                                        │
 * └─────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Phase 7: Vector Storage                                            │
 * │   - Generate embeddings                                            │
 * │   - Upsert to Pinecone with full metadata                         │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractText } from 'unpdf';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  LAT_INDEX_URL: 'https://www.lat.lt/teismu-praktika/lat-praktika/kasmenesines-lat-praktikos-apzvalgos-nuo-2015-m./61',
  LAT_BASE_URL: 'https://www.lat.lt',
  SYNC_STATE_FILE: path.join(process.cwd(), 'data', 'lat-sync-state.json'),
  INDEX_NAME: 'law-agent',
  BATCH_SIZE: 20,

  // Models
  // gemini-2.5-flash: stable, recommended for production
  // gemini-3-flash-preview: newest, potentially better but preview
  PARSING_MODEL: 'gemini-2.5-flash',
  SUMMARY_MODEL: 'gemini-2.5-flash',
  EMBEDDING_MODEL: 'text-embedding-004',

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,

  // Content limits
  MAX_SECTION_CHARS_PER_CHUNK: 12000,
  MAX_CASE_CONTENT_FOR_SUMMARY: 4000,
};

// ============================================================================
// Case Number Patterns
// ============================================================================

/**
 * Lithuanian Supreme Court case number formats:
 * - Civil cassation: e3K-3-XXX-XXX/YYYY or 3K-3-XXX-XXX/YYYY
 * - Criminal cassation: 2K-XXX-XXX/YYYY
 * - Extended panel: e3K-7-XXX-XXX/YYYY
 *
 * Components:
 * - Prefix: e (electronic), number (chamber type), K (cassation)
 * - First number: chamber (3 = civil, 2 = criminal, 7 = extended)
 * - Second number: case type
 * - Third number: sequential number
 * - Fourth number: registry code
 * - Year: 4 digits after /
 */
const CASE_NUMBER_PATTERNS = [
  // Full format with year: e3K-3-176-684/2024
  /[eE]?[23]K-[37]-\d{1,4}-\d{1,4}\/\d{4}/g,
  // Alternative: 3K-3-176-684/2024 (without e)
  /[23]K-[37]-\d{1,4}-\d{1,4}\/\d{4}/g,
  // With "Nr." prefix
  /Nr\.\s*[eE]?[23]K-[37]-\d{1,4}-\d{1,4}\/\d{4}/g,
  // With "byloje" or "bylą" prefix
  /byl[aąoė][a-z]*\s+(?:Nr\.\s*)?[eE]?[23]K-[37]-\d{1,4}-\d{1,4}\/\d{4}/gi,
];

// Strict validation pattern (must have full format with 4-digit year)
const VALID_CASE_NUMBER_PATTERN = /^[eE]?[23]K-[37]-\d{1,4}-\d{1,4}\/\d{4}$/;

// ============================================================================
// Types
// ============================================================================

interface PdfInfo {
  url: string;
  filename: string;
  year: string;
  month: string;
}

interface ExtractedSection {
  content: string;
  startPage: number;
  endPage: number;
}

interface CaseBoundary {
  startIndex: number;
  endIndex: number;
  content: string;
  estimatedPage: number;
}

interface ExtractedCase {
  caseNumber: string | null;
  caseNumberSource: 'regex' | 'llm' | 'none';
  caseTitle: string;
  caseSummary: string;
  content: string;
  pageNumber: number;
  confidence: 'high' | 'medium' | 'low';
}

interface ProcessedPdf {
  filename: string;
  url: string;
  year: string;
  month: string;
  cases: ExtractedCase[];
  qualityReport: QualityReport;
}

interface QualityReport {
  totalCases: number;
  casesWithNumber: number;
  casesWithoutNumber: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  issues: string[];
}

interface SyncState {
  lastSync: string;
  processedFiles: string[];
  version: string;
}

// ============================================================================
// Initialize Clients
// ============================================================================

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// ============================================================================
// Utility Functions
// ============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  description: string,
  maxRetries: number = CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`  ⚠ ${description} failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`);

      if (attempt < maxRetries) {
        await sleep(CONFIG.RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ============================================================================
// Phase 1: PDF Discovery & Download
// ============================================================================

function loadSyncState(): SyncState {
  try {
    if (fs.existsSync(CONFIG.SYNC_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(CONFIG.SYNC_STATE_FILE, 'utf-8'));
      return { ...state, version: state.version || '1.0' };
    }
  } catch (e) {
    console.log('Could not load sync state, starting fresh');
  }
  return { lastSync: '', processedFiles: [], version: '2.0' };
}

function saveSyncState(state: SyncState): void {
  const dir = path.dirname(CONFIG.SYNC_STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG.SYNC_STATE_FILE, JSON.stringify(state, null, 2));
}

async function discoverPdfs(): Promise<PdfInfo[]> {
  console.log('📥 Phase 1: Discovering PDFs...');

  const response = await fetch(CONFIG.LAT_INDEX_URL);
  const html = await response.text();

  const pdfLinks: PdfInfo[] = [];
  const regex = /href="(\/data\/public\/uploads\/[^"]+\.pdf)"/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const url = CONFIG.LAT_BASE_URL + match[1];
    const filename = path.basename(match[1]);

    const yearMatch = filename.match(/(\d{4})\.pdf$/);
    const monthMatch = filename.match(/praktika[_-]([a-z_-]+)_\d{4}/i);

    if (yearMatch) {
      pdfLinks.push({
        url,
        filename,
        year: yearMatch[1],
        month: monthMatch ? monthMatch[1].replace(/_/g, '-') : 'unknown',
      });
    }
  }

  console.log(`   Found ${pdfLinks.length} PDF links`);
  return pdfLinks;
}

async function downloadPdf(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  // Return a copy as Uint8Array to avoid detached buffer issues
  return new Uint8Array(buffer);
}

// ============================================================================
// Phase 2: Section Extraction
// ============================================================================

async function extractDarboTeiseSection(
  pdfData: Uint8Array
): Promise<ExtractedSection | null> {
  console.log('📄 Phase 2: Extracting Darbo teisė section...');

  const { text, totalPages } = await extractText(pdfData, { mergePages: true });

  // Find "Darbo teisė" header - NOT in table of contents
  // Pattern: optional page number + "Darbo teisė" + actual content (not dots)
  const sectionHeaderPattern = /(?:\d+\s+)?(Darbo\s+teis[ėe])\s+/gi;
  let darboTeiseMatch = null;
  let match;

  while ((match = sectionHeaderPattern.exec(text)) !== null) {
    const beforeChars = text.slice(Math.max(0, match.index - 100), match.index);
    const afterChars = text.slice(match.index + match[0].length, match.index + match[0].length + 100);

    // Skip if this looks like TOC entry (followed by dots leading to page number)
    if (afterChars.match(/^\.{3,}/)) {
      continue;
    }

    // Skip if preceded by dots (still in TOC area)
    if (beforeChars.match(/\.{5,}\s*\d*\s*$/)) {
      continue;
    }

    // Skip if too close to start (first 1500 chars is usually TOC)
    if (match.index < 1500) {
      continue;
    }

    darboTeiseMatch = match;
    break;
  }

  if (!darboTeiseMatch) {
    console.log('   ⚠ No "Darbo teisė" section found');
    return null;
  }

  const startIndex = darboTeiseMatch.index;

  // Find next major section
  const nextSectionHeaders = [
    'Prievolių teisė',
    'Daiktinė teisė',
    'Sutarčių teisė',
    'Šeimos teisė',
    'Paveldėjimo teisė',
    'Civilinio proceso teisė',
    'Nemokumo teisė',
    'Intelektinės nuosavybės teisė',
    'Draudimo teisė',
    'Konkurencijos teisė',
    'Bendrovių teisė',
    'Bankroto teisė',
    'Mokesčių teisė',
    'Sandoriai',
    'Atstovavimas',
    'Viešieji pirkimai',
    'Procesinė teisė',
    'Administracinė teisė',
    'Įmonių teisė',
  ];

  const nextSectionPattern = new RegExp(
    `(?:^|\\n)\\s*(?:\\d+\\s+)?(${nextSectionHeaders.join('|')})\\s*(?:\\n|$)`,
    'gim'
  );

  nextSectionPattern.lastIndex = startIndex + darboTeiseMatch[0].length + 500; // Skip at least 500 chars
  const nextSectionMatch = nextSectionPattern.exec(text);

  const endIndex = nextSectionMatch ? nextSectionMatch.index : text.length;
  const content = text.slice(startIndex, endIndex).trim();

  // Estimate page numbers
  const avgCharsPerPage = text.length / totalPages;
  const startPage = Math.floor(startIndex / avgCharsPerPage) + 1;
  const endPage = Math.floor(endIndex / avgCharsPerPage) + 1;

  console.log(`   Found section: ${content.length} chars, pages ${startPage}-${endPage}`);

  return { content, startPage, endPage };
}

// ============================================================================
// Phase 3: Case Boundary Detection (LLM)
// ============================================================================

async function detectCaseBoundaries(
  sectionContent: string,
  basePageNumber: number
): Promise<CaseBoundary[]> {
  console.log('🔍 Phase 3: Detecting case boundaries...');

  const model = genAI.getGenerativeModel({ model: CONFIG.PARSING_MODEL });

  // Process in chunks if section is too large
  const chunks: string[] = [];
  let remaining = sectionContent;

  while (remaining.length > 0) {
    if (remaining.length <= CONFIG.MAX_SECTION_CHARS_PER_CHUNK) {
      chunks.push(remaining);
      break;
    }

    // Find a good break point (paragraph boundary)
    let breakPoint = CONFIG.MAX_SECTION_CHARS_PER_CHUNK;
    const paragraphBreak = remaining.lastIndexOf('\n\n', breakPoint);
    if (paragraphBreak > breakPoint * 0.7) {
      breakPoint = paragraphBreak;
    }

    chunks.push(remaining.slice(0, breakPoint));
    remaining = remaining.slice(breakPoint);
  }

  console.log(`   Processing ${chunks.length} chunk(s)...`);

  const allBoundaries: CaseBoundary[] = [];
  let charOffset = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    const prompt = `Esi Lietuvos teisės ekspertas, analizuojantis LAT (Lietuvos Aukščiausiojo Teismo) praktikos apžvalgą.

UŽDUOTIS: Identifikuok atskiras bylas/nutartis šiame tekste. Kiekviena byla paprastai prasideda:
- Nauja pastraipa su bylos numeriu (pvz., "Byloje Nr. e3K-3-176-684/2024...")
- Arba nauja tema pradedant "Dėl..."
- Arba aiški teminė skirtis

SVARBU:
- Grąžink JSON masyvą su kiekvienos bylos pradžios ir pabaigos pozicijomis tekste
- Pozicijos turi būti tikslios (simbolių indeksai)
- Jei yra tik viena byla arba neįmanoma atskirti, grąžink vieną įrašą su visu tekstu

FORMATAS (tik JSON, be papildomo teksto):
[
  { "start": 0, "end": 1500, "preview": "Pirmi 50 simbolių..." },
  { "start": 1501, "end": 3000, "preview": "Pirmi 50 simbolių..." }
]

TEKSTAS (${chunk.length} simbolių):
${chunk}`;

    try {
      const result = await withRetry(
        () => model.generateContent(prompt),
        `Case boundary detection chunk ${chunkIndex + 1}`
      );

      const responseText = result.response.text().trim();
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const boundaries = JSON.parse(jsonMatch[0]);

        for (const b of boundaries) {
          const start = Math.max(0, b.start);
          const end = Math.min(chunk.length, b.end);
          const content = chunk.slice(start, end).trim();

          if (content.length > 100) { // Skip tiny fragments
            allBoundaries.push({
              startIndex: charOffset + start,
              endIndex: charOffset + end,
              content,
              estimatedPage: basePageNumber + Math.floor((charOffset + start) / 3000),
            });
          }
        }
      } else {
        // Fallback: treat entire chunk as one case
        allBoundaries.push({
          startIndex: charOffset,
          endIndex: charOffset + chunk.length,
          content: chunk,
          estimatedPage: basePageNumber + Math.floor(charOffset / 3000),
        });
      }
    } catch (error) {
      console.log(`   ⚠ LLM boundary detection failed for chunk ${chunkIndex + 1}, using fallback`);
      allBoundaries.push({
        startIndex: charOffset,
        endIndex: charOffset + chunk.length,
        content: chunk,
        estimatedPage: basePageNumber + Math.floor(charOffset / 3000),
      });
    }

    charOffset += chunk.length;
    await sleep(500); // Rate limiting
  }

  console.log(`   Detected ${allBoundaries.length} case boundaries`);
  return allBoundaries;
}

// ============================================================================
// Phase 4: Case Number Extraction (Regex + Validation)
// ============================================================================

function extractCaseNumber(content: string): { number: string | null; source: 'regex' | 'none' } {
  // Try all patterns
  for (const pattern of CASE_NUMBER_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    const matches = content.match(pattern);

    if (matches && matches.length > 0) {
      // Extract the actual case number (remove "Nr.", "byloje" etc.)
      for (const match of matches) {
        const cleaned = match
          .replace(/^byl[aąoė][a-z]*\s*/i, '')
          .replace(/^Nr\.\s*/i, '')
          .trim();

        // Validate format
        if (VALID_CASE_NUMBER_PATTERN.test(cleaned)) {
          return { number: cleaned, source: 'regex' };
        }

        // Try to fix common issues (missing 'e' prefix)
        const withE = 'e' + cleaned;
        if (VALID_CASE_NUMBER_PATTERN.test(withE)) {
          return { number: withE, source: 'regex' };
        }
      }
    }
  }

  // Try a more lenient pattern as last resort
  const lenientPattern = /[eE]?[23]K-[37]-\d+-\d+\/\d{4}/g;
  const lenientMatches = content.match(lenientPattern);
  if (lenientMatches && lenientMatches.length > 0) {
    const cleaned = lenientMatches[0].trim();
    if (cleaned.match(/\/\d{4}$/)) { // Must have year
      return { number: cleaned, source: 'regex' };
    }
  }

  return { number: null, source: 'none' };
}

async function extractCaseNumberWithLLM(content: string): Promise<string | null> {
  const model = genAI.getGenerativeModel({ model: CONFIG.PARSING_MODEL });

  const prompt = `Rask LAT bylos numerį šiame tekste.

LAT bylos numerio formatas: e3K-3-XXX-XXX/YYYY arba 3K-3-XXX-XXX/YYYY
Pavyzdžiai: e3K-3-176-684/2024, 3K-3-485-695/2018, e3K-7-66-469/2024

SVARBU:
- Numeris TURI turėti metus po "/" (4 skaitmenys)
- Jei nerandi pilno numerio su metais, grąžink "null"

Grąžink TIK bylos numerį arba "null" (be jokio kito teksto):

TEKSTAS:
${content.slice(0, 3000)}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // Validate response
    if (response === 'null' || response === '') {
      return null;
    }

    const cleaned = response
      .replace(/^["']|["']$/g, '')
      .replace(/^Nr\.\s*/i, '')
      .trim();

    if (VALID_CASE_NUMBER_PATTERN.test(cleaned)) {
      return cleaned;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// Phase 5: Metadata Generation (LLM)
// ============================================================================

async function generateCaseMetadata(
  content: string,
  caseNumber: string | null
): Promise<{ title: string; summary: string }> {
  const model = genAI.getGenerativeModel({ model: CONFIG.SUMMARY_MODEL });

  const prompt = `Esi Lietuvos darbo teisės ekspertas. Išanalizuok šią LAT nutartį.

UŽDUOTIS: Sukurk:
1. PAVADINIMĄ (pradedant "Dėl...") - trumpas, iki 100 simbolių
2. SANTRAUKĄ - 2-3 sakiniai apie:
   - Pagrindinį ginčo objektą
   - Teismo išaiškinimą
   - Aktualius DK straipsnius (jei minimi)

FORMATAS (tik JSON):
{
  "title": "Dėl ...",
  "summary": "..."
}

${caseNumber ? `Bylos Nr.: ${caseNumber}` : ''}

TEKSTAS:
${content.slice(0, CONFIG.MAX_CASE_CONTENT_FOR_SUMMARY)}`;

  try {
    const result = await withRetry(
      () => model.generateContent(prompt),
      'Metadata generation'
    );

    const responseText = result.response.text().trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: (parsed.title || 'Darbo teisės byla').slice(0, 200),
        summary: (parsed.summary || '').slice(0, 500),
      };
    }
  } catch (error) {
    console.log('   ⚠ Metadata generation failed, using fallback');
  }

  // Fallback: extract first sentence as title
  const firstSentence = content.slice(0, 200).split(/[.!?]/)[0] || 'Darbo teisės byla';
  return {
    title: normalizeWhitespace(firstSentence).slice(0, 200),
    summary: '',
  };
}

// ============================================================================
// Phase 6: Quality Validation
// ============================================================================

function validateAndReport(cases: ExtractedCase[]): QualityReport {
  const report: QualityReport = {
    totalCases: cases.length,
    casesWithNumber: 0,
    casesWithoutNumber: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    issues: [],
  };

  const seenNumbers = new Set<string>();

  for (const c of cases) {
    // Count by case number presence
    if (c.caseNumber) {
      report.casesWithNumber++;

      // Check for duplicates
      if (seenNumbers.has(c.caseNumber)) {
        report.issues.push(`Duplicate case number: ${c.caseNumber}`);
      }
      seenNumbers.add(c.caseNumber);

      // Validate format
      if (!VALID_CASE_NUMBER_PATTERN.test(c.caseNumber)) {
        report.issues.push(`Invalid case number format: ${c.caseNumber}`);
      }
    } else {
      report.casesWithoutNumber++;
      report.issues.push(`Missing case number: "${c.caseTitle.slice(0, 50)}..."`);
    }

    // Count by confidence
    switch (c.confidence) {
      case 'high': report.highConfidence++; break;
      case 'medium': report.mediumConfidence++; break;
      case 'low': report.lowConfidence++; break;
    }
  }

  return report;
}

// ============================================================================
// Phase 7: Vector Storage
// ============================================================================

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: CONFIG.EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function deleteOldVectors(): Promise<void> {
  console.log('🗑️  Deleting old LAT ruling vectors...');
  const index = pinecone.index(CONFIG.INDEX_NAME);

  // Query for all ruling vectors using random vectors
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
    console.log(`   Deleting ${idsToDelete.size} old vectors...`);
    const idArray = [...idsToDelete];
    for (let i = 0; i < idArray.length; i += 100) {
      await index.deleteMany(idArray.slice(i, i + 100));
    }
  }
}

async function upsertCases(
  cases: ExtractedCase[],
  pdf: PdfInfo
): Promise<void> {
  console.log(`📤 Phase 7: Upserting ${cases.length} cases to Pinecone...`);

  const index = pinecone.index(CONFIG.INDEX_NAME);
  const vectors = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const docId = pdf.filename.replace('.pdf', '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const vectorId = `${docId}-case-${i}`;

    // Create rich embedding text
    const embeddingText = [
      'LAT teismų praktika. Darbo teisė.',
      c.caseNumber ? `Byla Nr. ${c.caseNumber}.` : '',
      c.caseTitle,
      c.caseSummary,
      c.content.slice(0, 2000),
    ].filter(Boolean).join(' ');

    const embedding = await withRetry(
      () => generateEmbedding(embeddingText),
      `Embedding for case ${i + 1}`
    );

    vectors.push({
      id: vectorId,
      values: embedding,
      metadata: {
        docId: vectorId,
        docType: 'ruling' as const,
        sourceUrl: pdf.url,
        sourcePage: c.pageNumber,
        caseNumber: c.caseNumber || '',
        caseTitle: c.caseTitle,
        caseSummary: c.caseSummary,
        year: pdf.year,
        month: pdf.month,
        section: 'darbo_teise',
        confidence: c.confidence,
        caseNumberSource: c.caseNumberSource,
        text: c.content.slice(0, 3500),
      },
    });

    // Batch upsert
    if (vectors.length >= CONFIG.BATCH_SIZE) {
      await index.upsert(vectors);
      console.log(`   Upserted batch of ${vectors.length} vectors`);
      vectors.length = 0;
    }

    await sleep(300); // Rate limiting
  }

  // Final batch
  if (vectors.length > 0) {
    await index.upsert(vectors);
    console.log(`   Upserted final batch of ${vectors.length} vectors`);
  }
}

// ============================================================================
// Main Pipeline
// ============================================================================

async function processPdf(pdf: PdfInfo): Promise<ProcessedPdf | null> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📁 Processing: ${pdf.filename}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // Download
    const pdfData = await withRetry(
      () => downloadPdf(pdf.url),
      'PDF download'
    );

    // Extract section
    const section = await extractDarboTeiseSection(pdfData);
    if (!section) {
      return null;
    }

    // Detect case boundaries
    const boundaries = await detectCaseBoundaries(section.content, section.startPage);

    // Process each case
    const extractedCases: ExtractedCase[] = [];

    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      console.log(`\n   Case ${i + 1}/${boundaries.length}:`);

      // Extract case number (regex first, then LLM fallback)
      let caseNumber: string | null = null;
      let caseNumberSource: 'regex' | 'llm' | 'none' = 'none';

      const regexResult = extractCaseNumber(boundary.content);
      if (regexResult.number) {
        caseNumber = regexResult.number;
        caseNumberSource = 'regex';
        console.log(`      ✓ Case number (regex): ${caseNumber}`);
      } else {
        // Try LLM extraction
        console.log(`      Trying LLM extraction...`);
        const llmNumber = await extractCaseNumberWithLLM(boundary.content);
        if (llmNumber) {
          caseNumber = llmNumber;
          caseNumberSource = 'llm';
          console.log(`      ✓ Case number (LLM): ${caseNumber}`);
        } else {
          console.log(`      ⚠ No case number found`);
        }
      }

      // Generate metadata
      const metadata = await generateCaseMetadata(boundary.content, caseNumber);
      console.log(`      Title: ${metadata.title.slice(0, 60)}...`);

      // Determine confidence
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (caseNumber && caseNumberSource === 'regex' && metadata.summary) {
        confidence = 'high';
      } else if (caseNumber || metadata.summary) {
        confidence = 'medium';
      }

      extractedCases.push({
        caseNumber,
        caseNumberSource,
        caseTitle: metadata.title,
        caseSummary: metadata.summary,
        content: boundary.content,
        pageNumber: boundary.estimatedPage,
        confidence,
      });

      await sleep(500); // Rate limiting
    }

    // Validate and generate report
    const qualityReport = validateAndReport(extractedCases);

    console.log(`\n📊 Quality Report for ${pdf.filename}:`);
    console.log(`   Total cases: ${qualityReport.totalCases}`);
    console.log(`   With case number: ${qualityReport.casesWithNumber}`);
    console.log(`   Without case number: ${qualityReport.casesWithoutNumber}`);
    console.log(`   Confidence: ${qualityReport.highConfidence} high, ${qualityReport.mediumConfidence} medium, ${qualityReport.lowConfidence} low`);

    if (qualityReport.issues.length > 0) {
      console.log(`   Issues:`);
      for (const issue of qualityReport.issues.slice(0, 5)) {
        console.log(`      - ${issue}`);
      }
      if (qualityReport.issues.length > 5) {
        console.log(`      ... and ${qualityReport.issues.length - 5} more`);
      }
    }

    return {
      filename: pdf.filename,
      url: pdf.url,
      year: pdf.year,
      month: pdf.month,
      cases: extractedCases,
      qualityReport,
    };

  } catch (error) {
    console.error(`   ❌ Error processing ${pdf.filename}:`, error);
    return null;
  }
}

async function syncLatRulings(forceResync: boolean = false): Promise<void> {
  console.log('\n' + '═'.repeat(70));
  console.log('   LAT RULINGS SYNC v2.0');
  console.log('   High-Quality Extraction Pipeline');
  console.log('═'.repeat(70) + '\n');

  // Load state
  let state = loadSyncState();

  if (forceResync || state.version !== '2.0') {
    console.log('🔄 Force resync or version upgrade - clearing state');
    state = { lastSync: '', processedFiles: [], version: '2.0' };
    await deleteOldVectors();
  }

  // Discover PDFs
  const allPdfs = await discoverPdfs();

  // Filter to new files only
  const newPdfs = allPdfs.filter(pdf => !state.processedFiles.includes(pdf.filename));
  console.log(`\n📋 New PDFs to process: ${newPdfs.length}/${allPdfs.length}`);

  if (newPdfs.length === 0) {
    console.log('\n✅ No new PDFs found. Sync complete.');
    return;
  }

  // Process each PDF
  const allResults: ProcessedPdf[] = [];

  for (const pdf of newPdfs) {
    const result = await processPdf(pdf);

    if (result && result.cases.length > 0) {
      allResults.push(result);
      await upsertCases(result.cases, pdf);
    }

    // Update state after each PDF
    state.processedFiles.push(pdf.filename);
    saveSyncState(state);
  }

  // Final summary
  console.log('\n' + '═'.repeat(70));
  console.log('   SYNC COMPLETE');
  console.log('═'.repeat(70));

  const totalCases = allResults.reduce((sum, r) => sum + r.cases.length, 0);
  const casesWithNumber = allResults.reduce((sum, r) => sum + r.qualityReport.casesWithNumber, 0);
  const highConfidence = allResults.reduce((sum, r) => sum + r.qualityReport.highConfidence, 0);

  console.log(`\n📊 Final Statistics:`);
  console.log(`   PDFs processed: ${allResults.length}`);
  console.log(`   Total cases: ${totalCases}`);
  console.log(`   Cases with number: ${casesWithNumber} (${Math.round(casesWithNumber/totalCases*100)}%)`);
  console.log(`   High confidence: ${highConfidence} (${Math.round(highConfidence/totalCases*100)}%)`);

  state.lastSync = new Date().toISOString();
  saveSyncState(state);

  console.log(`\n📁 State saved to: ${CONFIG.SYNC_STATE_FILE}`);
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);
const forceResync = args.includes('--force') || args.includes('-f');

syncLatRulings(forceResync).catch(console.error);
