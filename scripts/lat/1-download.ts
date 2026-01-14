/**
 * LAT Pipeline - Step 1: PDF Download & Tracking
 *
 * This script:
 * 1. Scrapes LAT website for PDF links
 * 2. Downloads new PDFs (not already in database)
 * 3. Saves PDFs locally in data/lat-pdfs/{year}/
 * 4. Tracks downloads in SQLite database
 *
 * Usage:
 *   npx tsx scripts/lat/1-download.ts           # Download new PDFs only
 *   npx tsx scripts/lat/1-download.ts --force   # Re-download all PDFs
 *   npx tsx scripts/lat/1-download.ts --dry-run # Show what would be downloaded
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import {
  getDb,
  closeDb,
  upsertPdf,
  getPdfById,
  getAllPdfs,
  getStats,
  type LatPdf,
} from '../../src/lib/db';

dotenv.config({ path: '.env.local' });

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  LAT_INDEX_URL:
    'https://www.lat.lt/teismu-praktika/lat-praktika/kasmenesines-lat-praktikos-apzvalgos-nuo-2015-m./61',
  LAT_BASE_URL: 'https://www.lat.lt',
  PDF_DIR: path.join(process.cwd(), 'data', 'lat-pdfs'),
  DOWNLOAD_DELAY_MS: 500, // Polite delay between downloads
};

// ============================================================================
// Types
// ============================================================================

interface DiscoveredPdf {
  url: string;
  filename: string;
  year: number;
  month: string;
  id: string; // Generated ID like "2024-kovas"
}

// ============================================================================
// PDF Discovery
// ============================================================================

/**
 * Parse month from Lithuanian filename
 */
function parseMonth(filename: string): string {
  const monthMatch = filename.match(/praktika[_-]([a-z_-]+)[_-]\d{4}/i);
  if (monthMatch) {
    return monthMatch[1].replace(/_/g, '-').toLowerCase();
  }
  return 'unknown';
}

/**
 * Generate a unique ID for a PDF based on year and month
 */
function generatePdfId(year: number, month: string, filename: string): string {
  // Handle compound months like "liepa-rugpjutis"
  const normalizedMonth = month.replace(/-+/g, '-').toLowerCase();
  const baseId = `${year}-${normalizedMonth}`;

  // If month is unknown, use filename hash
  if (normalizedMonth === 'unknown') {
    const hash = filename.replace(/[^a-z0-9]/gi, '').slice(-8);
    return `${year}-${hash}`;
  }

  return baseId;
}

/**
 * Scrape LAT website for PDF links
 */
async function discoverPdfs(): Promise<DiscoveredPdf[]> {
  console.log('🔍 Discovering PDFs from LAT website...');
  console.log(`   URL: ${CONFIG.LAT_INDEX_URL}\n`);

  const response = await fetch(CONFIG.LAT_INDEX_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch LAT index: ${response.status}`);
  }

  const html = await response.text();
  const pdfLinks: DiscoveredPdf[] = [];
  const regex = /href="(\/data\/public\/uploads\/[^"]+\.pdf)"/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const url = CONFIG.LAT_BASE_URL + match[1];
    const filename = path.basename(match[1]);

    const yearMatch = filename.match(/(\d{4})\.pdf$/);
    if (!yearMatch) continue;

    const year = parseInt(yearMatch[1], 10);
    const month = parseMonth(filename);
    const id = generatePdfId(year, month, filename);

    pdfLinks.push({ url, filename, year, month, id });
  }

  // Sort by year descending, then by month
  pdfLinks.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return a.month.localeCompare(b.month);
  });

  console.log(`   Found ${pdfLinks.length} PDF links\n`);
  return pdfLinks;
}

// ============================================================================
// PDF Download
// ============================================================================

/**
 * Download a single PDF
 */
async function downloadPdf(url: string, destPath: string): Promise<number> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Ensure directory exists
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(destPath, bytes);
  return bytes.length;
}

/**
 * Get local path for a PDF
 */
function getPdfPath(pdf: DiscoveredPdf): string {
  return path.join(CONFIG.PDF_DIR, String(pdf.year), pdf.filename);
}

/**
 * Check if PDF exists locally
 */
function pdfExistsLocally(pdf: DiscoveredPdf): boolean {
  return fs.existsSync(getPdfPath(pdf));
}

// ============================================================================
// Main Pipeline
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const forceDownload = args.includes('--force');
  const dryRun = args.includes('--dry-run');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  LAT Pipeline - Step 1: PDF Download & Tracking');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (dryRun) {
    console.log('🔸 DRY RUN MODE - No downloads will be performed\n');
  }

  if (forceDownload) {
    console.log('🔸 FORCE MODE - Re-downloading all PDFs\n');
  }

  // Initialize database
  console.log('📂 Initializing database...');
  getDb();
  const initialStats = getStats();
  console.log(`   Existing PDFs in DB: ${initialStats.pdfs.total}\n`);

  // Discover PDFs from website
  const discovered = await discoverPdfs();

  // Determine which PDFs need downloading
  const toDownload: DiscoveredPdf[] = [];
  const existing: DiscoveredPdf[] = [];

  for (const pdf of discovered) {
    const inDb = getPdfById(pdf.id);
    const onDisk = pdfExistsLocally(pdf);

    if (forceDownload || !inDb || !onDisk) {
      toDownload.push(pdf);
    } else {
      existing.push(pdf);
    }
  }

  console.log('📊 Status:');
  console.log(`   Total discovered: ${discovered.length}`);
  console.log(`   Already have: ${existing.length}`);
  console.log(`   To download: ${toDownload.length}\n`);

  if (toDownload.length === 0) {
    console.log('✅ All PDFs already downloaded. Nothing to do.\n');
    closeDb();
    return;
  }

  // Show what will be downloaded
  console.log('📥 PDFs to download:');
  for (const pdf of toDownload.slice(0, 10)) {
    console.log(`   - ${pdf.id} (${pdf.filename})`);
  }
  if (toDownload.length > 10) {
    console.log(`   ... and ${toDownload.length - 10} more`);
  }
  console.log();

  if (dryRun) {
    console.log('🔸 Dry run complete. Use without --dry-run to download.\n');
    closeDb();
    return;
  }

  // Download PDFs
  console.log('⬇️  Downloading...\n');
  let downloadedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < toDownload.length; i++) {
    const pdf = toDownload[i];
    const destPath = getPdfPath(pdf);
    const progress = `[${i + 1}/${toDownload.length}]`;

    try {
      process.stdout.write(`   ${progress} ${pdf.id}... `);

      const bytes = await downloadPdf(pdf.url, destPath);
      const sizeMb = (bytes / 1024 / 1024).toFixed(2);

      // Record in database
      const pdfRecord: Partial<LatPdf> & { id: string } = {
        id: pdf.id,
        url: pdf.url,
        filename: pdf.filename,
        year: pdf.year,
        month: pdf.month,
        downloaded_at: new Date().toISOString(),
        status: 'downloaded',
      };
      upsertPdf(pdfRecord);

      console.log(`✓ (${sizeMb} MB)`);
      downloadedCount++;

      // Polite delay
      if (i < toDownload.length - 1) {
        await new Promise((r) => setTimeout(r, CONFIG.DOWNLOAD_DELAY_MS));
      }
    } catch (error) {
      console.log(`✗ Error: ${(error as Error).message}`);
      failedCount++;

      // Record failure in database
      upsertPdf({
        id: pdf.id,
        url: pdf.url,
        filename: pdf.filename,
        year: pdf.year,
        month: pdf.month,
        downloaded_at: new Date().toISOString(),
        status: 'failed',
        error_message: (error as Error).message,
      });
    }
  }

  // Final report
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Download Complete');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const finalStats = getStats();
  console.log('📊 Results:');
  console.log(`   Downloaded: ${downloadedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`   Total PDFs in DB: ${finalStats.pdfs.total}`);
  console.log(`   Status breakdown:`, finalStats.pdfs.byStatus);
  console.log();

  // List downloaded PDF locations
  console.log('📁 PDFs stored in:');
  const years = [...new Set(toDownload.map((p) => p.year))].sort((a, b) => b - a);
  for (const year of years.slice(0, 5)) {
    const yearDir = path.join(CONFIG.PDF_DIR, String(year));
    const count = toDownload.filter((p) => p.year === year).length;
    console.log(`   ${yearDir}/ (${count} files)`);
  }
  console.log();

  closeDb();
  console.log('✅ Step 1 complete. Run step 2 to extract text.\n');
}

// ============================================================================
// Run
// ============================================================================

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  closeDb();
  process.exit(1);
});
