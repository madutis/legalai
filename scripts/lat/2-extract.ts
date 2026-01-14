/**
 * LAT Pipeline - Step 2: Extract Cases from PDFs
 *
 * This script:
 * 1. Reads downloaded PDFs from disk
 * 2. Extracts text with page markers
 * 3. Sends full text to Gemini LLM for case extraction
 * 4. Stores extracted cases in SQLite database
 *
 * Usage:
 *   npx tsx scripts/lat/2-extract.ts              # Process unprocessed PDFs
 *   npx tsx scripts/lat/2-extract.ts --all        # Reprocess all PDFs
 *   npx tsx scripts/lat/2-extract.ts --pdf=ID     # Process specific PDF by ID
 *   npx tsx scripts/lat/2-extract.ts --dry-run    # Show what would be processed
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractText } from 'unpdf';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import {
  getDb,
  closeDb,
  getAllPdfs,
  getPdfById,
  getPdfsByStatus,
  upsertPdf,
  insertCases,
  deleteCasesByPdfId,
  getCasesByPdfId,
  getStats,
  type LatPdf,
  type LatCaseInput,
} from '../../src/lib/db';

dotenv.config({ path: '.env.local' });

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  PDF_DIR: path.join(process.cwd(), 'data', 'lat-pdfs'),
  MODEL: 'gemini-2.5-flash',
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  RATE_LIMIT_DELAY_MS: 1000, // Delay between PDFs
};

// ============================================================================
// Initialize Clients
// ============================================================================

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// ============================================================================
// Types
// ============================================================================

interface ExtractedCase {
  case_number: string | null;
  title: string;
  summary: string;
  full_text: string;
  page_start: number;
  page_end: number | null;
  is_labor_law: boolean;
  confidence: 'high' | 'medium' | 'low';
}

interface ExtractionResult {
  cases: ExtractedCase[];
  section_found: boolean;
  section_pages: { start: number; end: number } | null;
}

// ============================================================================
// PDF Text Extraction
// ============================================================================

/**
 * Extract text from PDF with page markers
 */
async function extractPdfText(pdfPath: string): Promise<{ text: string; pageCount: number }> {
  const buffer = fs.readFileSync(pdfPath);
  const pdfData = new Uint8Array(buffer);

  const result = await extractText(pdfData, { mergePages: false });

  // Combine pages with markers
  const pagesWithMarkers = result.text.map((pageText, index) => {
    const pageNum = index + 1;
    return `\n[PAGE ${pageNum}]\n${pageText}`;
  });

  return {
    text: pagesWithMarkers.join('\n'),
    pageCount: result.totalPages,
  };
}

// ============================================================================
// LLM Case Extraction
// ============================================================================

/**
 * Build the extraction prompt
 */
function buildExtractionPrompt(pdfText: string, pdfId: string): string {
  return `You are analyzing a Lithuanian Supreme Court (LAT) monthly case law review PDF.

DOCUMENT CONTEXT:
- This is a monthly compilation of significant court rulings
- Document ID: ${pdfId}
- The document contains multiple legal sections (civil, criminal, labor law, etc.)
- Each section contains summaries of court rulings with legal analysis
- Page numbers are marked as [PAGE X] throughout the text

YOUR TASK:
Extract ALL cases from the "Darbo teisė" (Labor Law) section ONLY.

For each labor law case, extract:
1. case_number: The case identifier (e.g., "e3K-3-176-684/2024", "3K-3-11-701/2021")
   - Usually appears as "Nr. XXXX" or "byloje Nr. XXXX" or at the end of case description
   - May be null if not present - that's OK, still extract the case
2. title: A brief descriptive title summarizing what the case is about (max 100 characters)
   - Write in Lithuanian
   - Focus on the main legal issue
3. summary: Key legal points and the court's ruling (max 500 characters)
   - Write in Lithuanian
   - Include the main legal principles established
4. full_text: The complete text of the case summary as it appears in the document
   - Include all paragraphs related to this case
   - Do not truncate
5. page_start: The page number where this case begins
6. page_end: The page number where this case ends (same as page_start if on one page)
7. is_labor_law: true if this is genuinely about labor/employment law, false if miscategorized
8. confidence: "high" if clear case boundaries and content, "medium" if some ambiguity, "low" if uncertain

IMPORTANT GUIDELINES:
- ONLY extract cases from the "Darbo teisė" section
- Skip the table of contents - look for actual case content
- Each case typically starts with a description of the dispute and ends with the court's ruling
- Cases are usually separated by clear topic changes or new case numbers
- If you find NO labor law cases, return an empty array
- Be thorough - extract ALL cases, don't skip any

RESPONSE FORMAT:
Return a valid JSON object with this exact structure:
{
  "section_found": true/false,
  "section_pages": {"start": X, "end": Y} or null,
  "cases": [
    {
      "case_number": "e3K-3-XXX-XXX/YYYY" or null,
      "title": "Brief title in Lithuanian",
      "summary": "Key legal points in Lithuanian",
      "full_text": "Complete case text...",
      "page_start": 18,
      "page_end": 19,
      "is_labor_law": true,
      "confidence": "high"
    }
  ]
}

Return ONLY the JSON object, no additional text or markdown.

DOCUMENT TEXT:
${pdfText}`;
}

/**
 * Extract cases using LLM
 */
async function extractCasesWithLLM(
  pdfText: string,
  pdfId: string
): Promise<ExtractionResult> {
  const model = genAI.getGenerativeModel({ model: CONFIG.MODEL });
  const prompt = buildExtractionPrompt(pdfText, pdfId);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Clean the response - remove markdown code blocks if present
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      const parsed = JSON.parse(jsonText) as ExtractionResult;

      // Validate structure
      if (!Array.isArray(parsed.cases)) {
        throw new Error('Invalid response: cases is not an array');
      }

      return parsed;
    } catch (error) {
      lastError = error as Error;
      console.log(`      ⚠ Attempt ${attempt}/${CONFIG.MAX_RETRIES} failed: ${lastError.message}`);

      if (attempt < CONFIG.MAX_RETRIES) {
        await sleep(CONFIG.RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(`LLM extraction failed after ${CONFIG.MAX_RETRIES} attempts: ${lastError?.message}`);
}

// ============================================================================
// Utility Functions
// ============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPdfPath(pdf: LatPdf): string {
  return path.join(CONFIG.PDF_DIR, String(pdf.year), pdf.filename);
}

// ============================================================================
// Main Pipeline
// ============================================================================

async function processPdf(pdf: LatPdf): Promise<{ cases: number; skipped: number }> {
  const pdfPath = getPdfPath(pdf);

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  console.log(`\n   📄 Extracting text...`);
  const { text, pageCount } = await extractPdfText(pdfPath);
  console.log(`      ${pageCount} pages, ${text.length} characters`);

  // Update PDF record with page count
  upsertPdf({ id: pdf.id, page_count: pageCount });

  console.log(`   🤖 Sending to LLM for case extraction...`);
  const result = await extractCasesWithLLM(text, pdf.id);

  if (!result.section_found) {
    console.log(`      ⚠ No "Darbo teisė" section found`);
    upsertPdf({
      id: pdf.id,
      status: 'processed',
      section_start: null,
      section_end: null,
      processed_at: new Date().toISOString(),
    });
    return { cases: 0, skipped: 0 };
  }

  console.log(`      Found section: pages ${result.section_pages?.start}-${result.section_pages?.end}`);
  console.log(`      Extracted ${result.cases.length} potential cases`);

  // Filter to only labor law cases
  const laborCases = result.cases.filter((c) => c.is_labor_law);
  const skippedCases = result.cases.length - laborCases.length;

  if (skippedCases > 0) {
    console.log(`      Filtered out ${skippedCases} non-labor-law cases`);
  }

  // Delete any existing cases for this PDF (for reprocessing)
  const existingCases = getCasesByPdfId(pdf.id);
  if (existingCases.length > 0) {
    console.log(`      Removing ${existingCases.length} existing cases...`);
    deleteCasesByPdfId(pdf.id);
  }

  // Convert to database format and insert
  if (laborCases.length > 0) {
    const dbCases: LatCaseInput[] = laborCases.map((c, index) => ({
      id: c.case_number
        ? `${pdf.id}-${c.case_number.replace(/[^a-zA-Z0-9-]/g, '-')}`
        : `${pdf.id}-case-${index + 1}`,
      pdf_id: pdf.id,
      case_number: c.case_number || null,
      title: c.title.slice(0, 200),
      summary: c.summary.slice(0, 1000),
      full_text: c.full_text,
      page_start: c.page_start,
      page_end: c.page_end,
      is_labor_law: c.is_labor_law,
      confidence: c.confidence,
      model_version: CONFIG.MODEL,
      extracted_at: new Date().toISOString(),
    }));

    console.log(`   💾 Storing ${dbCases.length} cases in database...`);
    insertCases(dbCases);
  }

  // Update PDF status
  upsertPdf({
    id: pdf.id,
    status: 'processed',
    section_start: result.section_pages?.start || null,
    section_end: result.section_pages?.end || null,
    processed_at: new Date().toISOString(),
  });

  return { cases: laborCases.length, skipped: skippedCases };
}

async function main() {
  const args = process.argv.slice(2);
  const processAll = args.includes('--all');
  const dryRun = args.includes('--dry-run');
  const specificPdf = args.find((a) => a.startsWith('--pdf='))?.split('=')[1];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  LAT Pipeline - Step 2: Extract Cases from PDFs');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (dryRun) {
    console.log('🔸 DRY RUN MODE - No processing will be performed\n');
  }

  // Initialize database
  console.log('📂 Initializing database...');
  getDb();
  const initialStats = getStats();
  console.log(`   PDFs in DB: ${initialStats.pdfs.total}`);
  console.log(`   Cases in DB: ${initialStats.cases.total}\n`);

  // Determine which PDFs to process
  let pdfsToProcess: LatPdf[] = [];

  if (specificPdf) {
    const pdf = getPdfById(specificPdf);
    if (!pdf) {
      console.error(`❌ PDF not found: ${specificPdf}`);
      closeDb();
      process.exit(1);
    }
    pdfsToProcess = [pdf];
    console.log(`📋 Processing specific PDF: ${specificPdf}\n`);
  } else if (processAll) {
    pdfsToProcess = getAllPdfs();
    console.log(`📋 Processing ALL ${pdfsToProcess.length} PDFs\n`);
  } else {
    pdfsToProcess = getPdfsByStatus('downloaded');
    console.log(`📋 Processing ${pdfsToProcess.length} unprocessed PDFs\n`);
  }

  if (pdfsToProcess.length === 0) {
    console.log('✅ No PDFs to process. Run step 1 first or use --all to reprocess.\n');
    closeDb();
    return;
  }

  // Show what will be processed
  console.log('📥 PDFs to process:');
  for (const pdf of pdfsToProcess.slice(0, 10)) {
    console.log(`   - ${pdf.id} (${pdf.year})`);
  }
  if (pdfsToProcess.length > 10) {
    console.log(`   ... and ${pdfsToProcess.length - 10} more`);
  }
  console.log();

  if (dryRun) {
    console.log('🔸 Dry run complete. Use without --dry-run to process.\n');
    closeDb();
    return;
  }

  // Process PDFs
  console.log('🔄 Processing...');

  let totalCases = 0;
  let totalSkipped = 0;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pdfsToProcess.length; i++) {
    const pdf = pdfsToProcess[i];
    const progress = `[${i + 1}/${pdfsToProcess.length}]`;

    console.log(`\n${progress} ${pdf.id}`);

    try {
      const result = await processPdf(pdf);
      totalCases += result.cases;
      totalSkipped += result.skipped;
      successCount++;
      console.log(`   ✅ Done: ${result.cases} cases extracted`);

      // Rate limiting
      if (i < pdfsToProcess.length - 1) {
        await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${(error as Error).message}`);
      upsertPdf({
        id: pdf.id,
        status: 'failed',
        error_message: (error as Error).message,
      });
      failCount++;
    }
  }

  // Final report
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Extraction Complete');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const finalStats = getStats();
  console.log('📊 Results:');
  console.log(`   PDFs processed: ${successCount}`);
  console.log(`   PDFs failed: ${failCount}`);
  console.log(`   Cases extracted: ${totalCases}`);
  console.log(`   Cases skipped (not labor law): ${totalSkipped}`);
  console.log();
  console.log('📊 Database totals:');
  console.log(`   Total cases: ${finalStats.cases.total}`);
  console.log(`   With case number: ${finalStats.cases.withCaseNumber}`);
  console.log(`   Labor law: ${finalStats.cases.laborLaw}`);
  console.log();

  closeDb();
  console.log('✅ Step 2 complete. Run step 3 to ingest to Pinecone.\n');
}

// ============================================================================
// Run
// ============================================================================

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  closeDb();
  process.exit(1);
});
