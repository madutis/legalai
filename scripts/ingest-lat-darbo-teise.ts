import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { extractText } from 'unpdf';

dotenv.config({ path: '.env.local' });

const RULINGS_DIR = path.join(process.cwd(), 'data', 'rulings');
const INDEX_NAME = 'law-agent';
const CHUNK_SIZE = 1000; // Slightly larger chunks for case context
const CHUNK_OVERLAP = 150;
const BATCH_SIZE = 50;

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

interface CaseEntry {
  caseNumber?: string;
  title: string;
  content: string;
  rawContent: string; // Original content without prefix
  summary?: string; // AI-generated summary
}

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

function extractDarboTeiseSection(text: string): string | null {
  // Find "Darbo teisė" section header - NOT in table of contents
  // TOC entries are followed by dots like "Darbo teisė ........ 24"
  // Actual section headers are on their own line, followed by "Dėl" case headers

  // Pattern: "Darbo teisė" on its own line, NOT followed by dots
  const sectionHeaderPattern = /\n\s*(Darbo\s+teis[ėe])\s*\n(?!\.)/gi;

  let darboTeiseMatch = null;
  let match;

  while ((match = sectionHeaderPattern.exec(text)) !== null) {
    // Check that this is not in TOC (not followed by dots or page numbers pattern)
    const nextChars = text.slice(match.index + match[0].length, match.index + match[0].length + 50);
    if (!nextChars.match(/^[\s.]+\d+/) && !nextChars.match(/^\.{3,}/)) {
      darboTeiseMatch = match;
      break;
    }
  }

  if (!darboTeiseMatch) {
    return null;
  }

  const startIndex = darboTeiseMatch.index;

  // Find the next major section header (other law areas or subsections)
  // These appear as standalone headers on their own lines
  // Include both "X teisė" patterns AND common subsection headers like "Viešieji pirkimai"
  const nextSectionPattern = /\n\s*(?:Prievolių|Daiktinė|Sutarčių|Šeimos|Paveldėjimo|Civilinio proceso|Nemokumo|Intelektinės|Draudimo|Konkurencijos|Bendrovių|Bankroto|Mokesčių|Sandoriai|Atstovavimas)\s+teis[ėe]\s*\n|\n\s*(?:Viešieji pirkimai|Viešųjų pirkimų|Procesinė teisė|Proceso teisė|Įmonių teisė)\s*\n/gi;

  let endIndex = text.length;
  const textAfterStart = text.slice(startIndex + 20);

  const nextMatch = nextSectionPattern.exec(textAfterStart);
  if (nextMatch && nextMatch.index !== undefined) {
    endIndex = startIndex + 20 + nextMatch.index;
  }

  const sectionText = text.slice(startIndex, endIndex);

  // Clean up the section text
  return cleanSectionText(sectionText);
}

function cleanSectionText(text: string): string {
  // Remove table of contents dots
  let cleaned = text.replace(/\.{5,}/g, ' ');

  // Remove page numbers that appear standalone
  cleaned = cleaned.replace(/\n\s*\d{1,3}\s*\n/g, '\n');

  // Normalize whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

function parseCases(sectionText: string): CaseEntry[] {
  const cases: CaseEntry[] = [];

  // Split by "Dėl" headers - each case starts with "Dėl "
  const parts = sectionText.split(/\n(?=Dėl\s+)/i);

  for (const part of parts) {
    if (part.length < 200) continue; // Skip header/short parts

    // Extract title (first line)
    const titleMatch = part.match(/^(Dėl\s+[^\n]+)/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Darbo teisė';

    // Extract case number - usually at the end like "Nr. e3K-3-xxx-xxx/yyyy"
    // Get the LAST occurrence (case numbers at end are more reliable)
    const caseNumMatches = part.match(/Nr\.\s*(e?\d*K-[\d-]+\/\d+)/gi);
    const caseNumber = caseNumMatches
      ? caseNumMatches[caseNumMatches.length - 1].replace(/Nr\.\s*/i, '').trim()
      : undefined;

    // Clean content
    const rawContent = part.trim();

    // Create prefixed content for better RAG retrieval
    let content = rawContent;
    if (caseNumber) {
      // Prefix with case number for searchability
      content = `LAT byla Nr. ${caseNumber}\n\n${rawContent}`;
    }

    cases.push({
      caseNumber,
      title: title.slice(0, 200), // Truncate long titles
      content,
      rawContent,
    });
  }

  return cases;
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const charSize = chunkSize * 4;
  const charOverlap = overlap * 4;

  // Don't collapse all whitespace - preserve some structure
  text = text.replace(/[ \t]+/g, ' ').trim();

  let start = 0;
  while (start < text.length) {
    let end = start + charSize;

    if (end < text.length) {
      // Try to break at sentence or paragraph boundary
      const breakPoints = ['. ', '.\n', '\n\n', '\n'];
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

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const truncatedText = text.slice(0, 30000);
  const result = await model.embedContent(truncatedText);
  return result.embedding.values;
}

async function generateCaseSummary(caseContent: string, caseTitle: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Esi Lietuvos darbo teisės ekspertas. Pateikta LAT (Lietuvos Aukščiausiojo Teismo) bylos santrauka darbo teisės srityje.

Sugeneruok trumpą (1-2 sakiniai, max 150 žodžių) bylos santrauką lietuvių kalba, kuri apimtų:
1. Pagrindinį teisinį klausimą/ginčą
2. Svarbius DK (Darbo kodekso) straipsnius, jei minimi
3. Teismo sprendimo esmę

Formatas: rašyk glaustai, be įžangos, tik esminę informaciją. Nenaudok žodžių "ši byla", "šioje byloje" - pradėk tiesiai nuo esmės.

Bylos pavadinimas: ${caseTitle}

Bylos turinys:
${caseContent.slice(0, 6000)}

Santrauka:`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text().trim();
    return summary.slice(0, 500); // Limit summary length
  } catch (error) {
    console.error('Summary generation error:', error);
    return ''; // Return empty on error
  }
}

async function deleteExistingLatRulings() {
  const index = pinecone.index(INDEX_NAME);
  console.log('Finding existing LAT rulings to delete...');

  // Use list to find all LAT entries
  const allLatIds: string[] = [];

  // Query multiple times with different vectors to find LAT entries
  for (let i = 0; i < 50; i++) {
    const randomVector = Array(768).fill(0).map(() => Math.random() * 0.1);
    const query = await index.query({
      vector: randomVector,
      topK: 100,
      includeMetadata: false
    });

    const latIds = query.matches
      ?.filter(m => m.id.includes('LAT'))
      .map(m => m.id) || [];

    allLatIds.push(...latIds);

    if (i % 10 === 0) {
      process.stdout.write(`\r  Scanning... found ${new Set(allLatIds).size} LAT entries`);
    }
  }

  const uniqueIds = [...new Set(allLatIds)];
  console.log(`\n  Found ${uniqueIds.length} existing LAT entries to delete`);

  if (uniqueIds.length > 0) {
    for (let i = 0; i < uniqueIds.length; i += 100) {
      const batch = uniqueIds.slice(i, i + 100);
      await index.deleteMany(batch);
      process.stdout.write(`\r  Deleted ${Math.min(i + 100, uniqueIds.length)}/${uniqueIds.length}`);
    }
    console.log('\n  Done deleting');
  }
}

function parseFileInfo(filename: string): { year: string; month: string } {
  // Pattern 1: LAT_2024_Spalio.pdf
  const match1 = filename.match(/LAT_(\d{4})_([^.]+)\.pdf/i);
  if (match1) {
    return { year: match1[1], month: match1[2] };
  }

  // Pattern 2: lat_aktuali_praktika_birzelis_2025.pdf
  const match2 = filename.match(/lat_aktua?l?i_praktika_([^_]+)_(\d{4})\.pdf/i);
  if (match2) {
    return { year: match2[2], month: match2[1] };
  }

  return { year: 'unknown', month: 'unknown' };
}

async function main() {
  console.log('=== LAT Rulings: Darbo teisė Section Extraction ===\n');

  // Step 1: Delete existing LAT rulings
  await deleteExistingLatRulings();

  // Step 2: Process PDFs and extract Darbo teisė sections
  // Include both LAT_* and lat_aktuali_praktika_* patterns
  const files = fs.readdirSync(RULINGS_DIR)
    .filter(f => f.endsWith('.pdf') && (f.startsWith('LAT_') || f.startsWith('lat_aktu')))
    .sort();

  console.log(`\nProcessing ${files.length} LAT ruling files...\n`);

  const index = pinecone.index(INDEX_NAME);
  let totalFiles = 0;
  let filesWithDarboTeise = 0;
  let totalChunks = 0;
  let pendingVectors: any[] = [];

  for (const file of files) {
    const filePath = path.join(RULINGS_DIR, file);
    const { year, month } = parseFileInfo(file);

    process.stdout.write(`[${++totalFiles}/${files.length}] ${file}...`);

    const text = await extractTextFromPdf(filePath);
    if (!text) {
      console.log(' SKIP (no text)');
      continue;
    }

    const darboTeiseSection = extractDarboTeiseSection(text);
    if (!darboTeiseSection) {
      console.log(' SKIP (no Darbo teisė section)');
      continue;
    }

    filesWithDarboTeise++;

    // Parse individual cases from the Darbo teisė section
    const cases = parseCases(darboTeiseSection);
    process.stdout.write(` ${cases.length} cases`);

    const docId = file.replace('.pdf', '').replace(/[^a-zA-Z0-9_-]/g, '_');

    for (let i = 0; i < cases.length; i++) {
      const caseEntry = cases[i];

      try {
        // Generate AI summary for the case
        process.stdout.write(`\r  Generating summary for case ${i + 1}/${cases.length}...`);
        const summary = await generateCaseSummary(caseEntry.rawContent, caseEntry.title);

        // Build embedding content with summary prefix for better retrieval
        let embeddingContent = '';
        if (caseEntry.caseNumber) {
          embeddingContent += `LAT byla Nr. ${caseEntry.caseNumber}\n`;
        }
        if (summary) {
          embeddingContent += `Santrauka: ${summary}\n\n`;
        }
        embeddingContent += caseEntry.rawContent;

        const embedding = await generateEmbedding(embeddingContent);

        // Store metadata with case information
        const metadata: Record<string, any> = {
          docId,
          docType: 'ruling',
          sourceFile: `rulings/${file}`,
          caseIndex: i,
          totalCases: cases.length,
          text: caseEntry.rawContent.slice(0, 3500), // Store more text since it's one case
          year,
          month,
          section: 'darbo_teise',
          caseTitle: caseEntry.title,
        };

        // Add case number if found
        if (caseEntry.caseNumber) {
          metadata.caseNumber = caseEntry.caseNumber;
        }

        // Add AI-generated summary
        if (summary) {
          metadata.caseSummary = summary;
        }

        pendingVectors.push({
          id: `${docId}-case-${i}`,
          values: embedding,
          metadata,
        });

        // Upsert in batches
        if (pendingVectors.length >= BATCH_SIZE) {
          await index.upsert(pendingVectors);
          totalChunks += pendingVectors.length;
          pendingVectors = [];
        }

        // Rate limiting for API calls
        await new Promise(r => setTimeout(r, 150));
      } catch (error) {
        console.error(`\n  Error processing case ${i}:`, error);
      }
    }
    console.log(' ✓'); // Newline after all cases processed
  }

  // Upsert remaining vectors
  if (pendingVectors.length > 0) {
    await index.upsert(pendingVectors);
    totalChunks += pendingVectors.length;
  }

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total files processed: ${totalFiles}`);
  console.log(`Files with Darbo teisė: ${filesWithDarboTeise}`);
  console.log(`Total cases ingested: ${totalChunks}`);
  console.log(`Files without Darbo teisė: ${totalFiles - filesWithDarboTeise}`);

  // Verify in Pinecone
  const stats = await index.describeIndexStats();
  console.log(`\nPinecone total vectors: ${stats.totalRecordCount}`);
}

main().catch(console.error);
