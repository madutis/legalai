/**
 * Fetch latest Lithuanian Labor Code (Darbo Kodeksas) from e-TAR
 *
 * Usage:
 *   npx tsx scripts/fetch-etar-labor-code.ts                  # Check for updates, download and parse
 *   npx tsx scripts/fetch-etar-labor-code.ts --ingest         # Also re-ingest to Pinecone
 *   npx tsx scripts/fetch-etar-labor-code.ts --force          # Force re-fetch even if unchanged
 *   npx tsx scripts/fetch-etar-labor-code.ts --ingest --force # Force re-ingest
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const ETAR_DOC_ID = 'f6d686707e7011e6b969d7ae07280e89';
const ETAR_BASE_URL = 'https://www.e-tar.lt';
const ASR_URL = `${ETAR_BASE_URL}/portal/lt/legalAct/${ETAR_DOC_ID}/asr`;

// Lithuanian ordinal words to numbers
const ORDINAL_MAP: Record<string, number> = {
  'PIRMOJI': 1, 'PIRMASIS': 1, 'PIRMAS': 1,
  'ANTROJI': 2, 'ANTRASIS': 2, 'ANTRAS': 2,
  'TREČIOJI': 3, 'TREČIASIS': 3, 'TREČIAS': 3,
  'KETVIRTOJI': 4, 'KETVIRTASIS': 4, 'KETVIRTAS': 4,
  'PENKTOJI': 5, 'PENKTASIS': 5, 'PENKTAS': 5,
  'ŠEŠTOJI': 6, 'ŠEŠTASIS': 6, 'ŠEŠTAS': 6,
  'SEPTINTOJI': 7, 'SEPTINTASIS': 7, 'SEPTINTAS': 7,
  'AŠTUNTOJI': 8, 'AŠTUNTASIS': 8, 'AŠTUNTAS': 8,
  'DEVINTOJI': 9, 'DEVINTASIS': 9, 'DEVINTAS': 9,
  'DEŠIMTOJI': 10, 'DEŠIMTASIS': 10, 'DEŠIMTAS': 10,
};

// Roman numerals to numbers
const ROMAN_MAP: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
  'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
  'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15,
};

interface StructureMarker {
  type: 'dalis' | 'skyrius' | 'skirsnis';
  num: number;
  title: string;
  pos: number;
}

interface Article {
  num: number;
  title: string;
  text: string;
  dalis?: number;
  dalisTitle?: string;
  skyrius?: number;
  skyriusTitle?: string;
  skirsnis?: number;
  skirsnisTitle?: string;
  references: number[]; // References to other articles
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

  // Extract edition ID
  const idMatch = html.match(/actualEditionId=([^"&]+)/);
  if (!idMatch) {
    throw new Error('Could not find edition ID in e-TAR page');
  }

  // Extract effective date (e.g., "2025-01-01")
  const dateMatch = html.match(/Galiojanti suvestinė redakcija[^[]*\[(\d{4}-\d{2}-\d{2})/);
  const effectiveDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

  return { editionId: idMatch[1], effectiveDate };
}

/**
 * Download DOCX from e-TAR
 */
async function downloadDocx(editionId: string): Promise<Buffer> {
  const url = `${ETAR_BASE_URL}/rs/actualedition/${ETAR_DOC_ID}/${editionId}/format/MSO2010_DOCX/`;
  console.log(`Downloading DOCX from: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download DOCX: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Extract structure markers (dalis, skyrius, skirsnis) from text
 */
function extractStructure(text: string): StructureMarker[] {
  const markers: StructureMarker[] = [];

  // DALIS (Part) - e.g., "PIRMOJI DALIS" or "ANTROJI DALIS"
  const dalisPattern = /([A-ZĄČĘĖĮŠŲŪŽ]+)\s+DALIS\s*\n\s*([^\n]+)/g;
  let match;
  while ((match = dalisPattern.exec(text)) !== null) {
    const num = ORDINAL_MAP[match[1].toUpperCase()] || 0;
    if (num > 0) {
      markers.push({
        type: 'dalis',
        num,
        title: match[2].trim(),
        pos: match.index,
      });
    }
  }

  // SKYRIUS (Chapter) - e.g., "I SKYRIUS", "II SKYRIUS"
  const skyriusPattern = /([IVX]+)\s+SKYRIUS\s*\n\s*([^\n]+)/g;
  while ((match = skyriusPattern.exec(text)) !== null) {
    const num = ROMAN_MAP[match[1]] || 0;
    if (num > 0) {
      markers.push({
        type: 'skyrius',
        num,
        title: match[2].trim(),
        pos: match.index,
      });
    }
  }

  // SKIRSNIS (Section) - e.g., "PIRMASIS SKIRSNIS"
  const skirsnisPattern = /([A-ZĄČĘĖĮŠŲŪŽ]+)\s+SKIRSNIS\s*\n\s*([^\n]+)/g;
  while ((match = skirsnisPattern.exec(text)) !== null) {
    const num = ORDINAL_MAP[match[1].toUpperCase()] || 0;
    if (num > 0) {
      markers.push({
        type: 'skirsnis',
        num,
        title: match[2].trim(),
        pos: match.index,
      });
    }
  }

  return markers.sort((a, b) => a.pos - b.pos);
}

/**
 * Clean article text by removing amendment history noise and trailing section headers
 */
function cleanArticleText(text: string): string {
  // Remove amendment history blocks like:
  // "Straipsnio dalies pakeitimai:\nNr. ,\n2022-06-28,\npaskelbta TAR 2022-07-11, i. k. 2022-15178"
  const patterns = [
    /Straipsnio (?:dalies |punkto )?pakeitimai:\s*\nNr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
    /Straipsnio dalies numeracijos pakeitimas:\s*\nNr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
    /Papildyta straipsnio dalimi:\s*\nNr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
    /Pakeistas straipsnio pavadinimas:\s*\nNr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
    /Neteko galios nuo [\d-]+:\s*\nNr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
    // Catch-all for any remaining TAR references
    /Nr\.\s*,\s*\n[\d-]+,\s*\npaskelbta TAR [\d-]+, i\. k\. [\d-]+\s*/g,
  ];

  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '\n');
  }

  // Remove trailing section/chapter headers that leaked from next article
  // e.g., "TREČIASIS SKIRSNIS\nDARBO SANTYKIŲ YPATUMAI..."
  cleaned = cleaned.replace(/\n[A-ZĄČĘĖĮŠŲŪŽ]+\s+(?:SKIRSNIS|SKYRIUS|DALIS)\s*\n[A-ZĄČĘĖĮŠŲŪŽ\s]+$/g, '');

  // Also remove trailing chapter markers like "VIII SKYRIUS\nDARBO IR POILSIO LAIKAS"
  cleaned = cleaned.replace(/\n[IVX]+\s+SKYRIUS\s*\n[A-ZĄČĘĖĮŠŲŪŽ\s]+$/g, '');

  // Clean up multiple newlines left after removal
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Extract references to other articles from text
 */
function extractReferences(text: string, selfNum: number): number[] {
  const refs = new Set<number>();
  // Match patterns like "57 straipsnio", "126 straipsnis", "str. 52"
  const patterns = [
    /(\d+)\s*straipsni[oįųs]/gi,
    /str\.\s*(\d+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseInt(match[1]);
      if (num !== selfNum && num >= 1 && num <= 300) {
        refs.add(num);
      }
    }
  }

  return [...refs].sort((a, b) => a - b);
}

/**
 * Parse DOCX and extract articles with full metadata
 */
async function parseDocx(buffer: Buffer): Promise<{ text: string; articles: Article[] }> {
  console.log('Parsing DOCX...');

  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  console.log(`Extracted ${text.length} characters`);

  // Clean up text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');

  // Extract structure markers
  const structure = extractStructure(cleanedText);
  console.log(`Found ${structure.filter(s => s.type === 'dalis').length} parts, ${structure.filter(s => s.type === 'skyrius').length} chapters, ${structure.filter(s => s.type === 'skirsnis').length} sections`);

  // Find start of actual Labor Code (after adoption law articles)
  // The actual code starts with "PIRMOJI DALIS" or "DARBO KODEKSAS"
  const codeStartMatch = cleanedText.match(/DARBO\s+KODEKSAS\s*\n/);
  const codeStartPos = codeStartMatch ? codeStartMatch.index! : 0;

  // Extract articles
  const articlePattern = /(?:^|\n)\s*(\d+)\s*straipsnis\.?\s+([A-ZĄČĘĖĮŠŲŪŽ][^\n]*)/g;
  const rawMatches: { num: number; title: string; start: number }[] = [];

  let match;
  while ((match = articlePattern.exec(cleanedText)) !== null) {
    const num = parseInt(match[1]);
    const title = match[2].trim().replace(/\s+/g, ' ');

    // Skip adoption law articles (before codeStartPos) unless they're the first few
    // Skip invalid articles
    if (num >= 1 && num <= 300 && title.length > 3 && !/^[)\].,;:]/.test(title)) {
      // For articles after code start, use those; for early articles, only keep them if before code start
      if (match.index >= codeStartPos || num <= 6) {
        rawMatches.push({ num, title, start: match.index });
      }
    }
  }

  // Keep only Labor Code articles (those after DARBO KODEKSAS marker, or deduplicated)
  const codeArticles = rawMatches.filter(m => m.start >= codeStartPos);
  const seen = new Set<number>();
  const uniqueMatches = codeArticles.filter(m => {
    if (seen.has(m.num)) return false;
    seen.add(m.num);
    return true;
  });

  // Build articles with metadata
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

    // Find applicable structure for this article
    const applicableStructure = structure.filter(s => s.pos < start);
    const currentDalis = applicableStructure.filter(s => s.type === 'dalis').pop();
    const currentSkyrius = applicableStructure.filter(s => s.type === 'skyrius').pop();
    // Skirsnis resets with each skyrius
    const currentSkirsnis = applicableStructure
      .filter(s => s.type === 'skirsnis' && (!currentSkyrius || s.pos > currentSkyrius.pos))
      .pop();

    // Extract references
    const references = extractReferences(articleText, artMatch.num);

    articles.push({
      num: artMatch.num,
      title: artMatch.title,
      text: articleText,
      dalis: currentDalis?.num,
      dalisTitle: currentDalis?.title,
      skyrius: currentSkyrius?.num,
      skyriusTitle: currentSkyrius?.title,
      skirsnis: currentSkirsnis?.num,
      skirsnisTitle: currentSkirsnis?.title,
      references,
    });
  }

  articles.sort((a, b) => a.num - b.num);
  return { text: cleanedText, articles };
}

/**
 * Ingest articles to Pinecone with rich metadata
 */
async function ingestToPinecone(articles: Article[], effectiveDate: string): Promise<void> {
  console.log(`\nIngesting ${articles.length} articles to Pinecone...`);

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const index = pinecone.index(process.env.PINECONE_INDEX || 'law-agent');

  // Delete existing labor code articles
  console.log('Deleting existing labor code articles...');
  const existingIds = articles.map(a => `darbo-kodeksas-str-${a.num}`);
  for (let i = 0; i < existingIds.length; i += 100) {
    try {
      await index.deleteMany(existingIds.slice(i, i + 100));
    } catch {
      // Ignore errors for non-existent IDs
    }
  }

  // Generate embeddings and upsert
  const vectors: any[] = [];

  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];

    // Build rich text for embedding
    const contextParts = [`Darbo kodeksas ${art.num} straipsnis: ${art.title}`];
    if (art.dalisTitle) contextParts.push(`Dalis: ${art.dalisTitle}`);
    if (art.skyriusTitle) contextParts.push(`Skyrius: ${art.skyriusTitle}`);
    if (art.skirsnisTitle) contextParts.push(`Skirsnis: ${art.skirsnisTitle}`);
    const textForEmbed = contextParts.join('\n') + '\n\n' + art.text;

    try {
      const result = await model.embedContent(textForEmbed.slice(0, 30000));
      vectors.push({
        id: `darbo-kodeksas-str-${art.num}`,
        values: result.embedding.values,
        metadata: {
          docId: 'darbo-kodeksas',
          docType: 'legislation',
          sourceFile: 'e-tar.lt',
          effectiveDate,
          articleNumber: art.num,
          articleTitle: art.title,
          dalis: art.dalis || 0,
          dalisTitle: art.dalisTitle || '',
          skyrius: art.skyrius || 0,
          skyriusTitle: art.skyriusTitle || '',
          skirsnis: art.skirsnis || 0,
          skirsnisTitle: art.skirsnisTitle || '',
          references: art.references.join(','),
          text: art.text.slice(0, 4000),
          chunkIndex: 0,
          totalChunks: 1,
        },
      });

      if ((i + 1) % 20 === 0) {
        console.log(`  Embedded ${i + 1}/${articles.length} articles`);
      }

      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.error(`Error embedding article ${art.num}:`, err);
    }
  }

  console.log(`\nUploading ${vectors.length} vectors...`);
  for (let i = 0; i < vectors.length; i += 100) {
    await index.upsert(vectors.slice(i, i + 100));
  }

  console.log('Ingestion complete!');

  const stats = await index.describeIndexStats();
  console.log(`Total vectors in index: ${stats.totalRecordCount}`);
}

/**
 * Save articles to JSON and generate index files
 */
function saveArticles(articles: Article[], editionId: string, effectiveDate: string): void {
  // Save full data
  const output = {
    editionId,
    effectiveDate,
    fetchedAt: new Date().toISOString(),
    articleCount: articles.length,
    articles,
  };
  const outputPath = path.join('data', `darbo-kodeksas-${editionId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Saved to ${outputPath}`);

  // Save latest edition tracker
  const latestPath = path.join('data', 'darbo-kodeksas-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify({ editionId, effectiveDate, updatedAt: new Date().toISOString() }, null, 2));

  // Generate lookup JSON
  const chapters = new Map<string, Article[]>();
  for (const art of articles) {
    const key = art.skyriusTitle || 'Kita';
    if (!chapters.has(key)) chapters.set(key, []);
    chapters.get(key)!.push(art);
  }

  const lookup = {
    source: 'e-TAR',
    effectiveDate,
    editionId,
    totalArticles: articles.length,
    chapters: [...chapters.entries()].map(([name, arts]) => ({
      name,
      articleCount: arts.length,
      articles: arts.map(a => ({ num: a.num, title: a.title })).sort((a, b) => a.num - b.num),
    })).sort((a, b) => a.name.localeCompare(b.name, 'lt')),
    articleIndex: articles.map(a => ({
      num: a.num,
      title: a.title,
      skyrius: a.skyriusTitle || null,
      skirsnis: a.skirsnisTitle || null,
      refs: a.references,
    })).sort((a, b) => a.num - b.num),
  };
  fs.writeFileSync(path.join('data', 'darbo-kodeksas-lookup.json'), JSON.stringify(lookup, null, 2));

  // Generate markdown index
  const chapterCounts = [...chapters.entries()]
    .map(([name, arts]) => ({ name, count: arts.length }))
    .sort((a, b) => b.count - a.count);

  let md = `# Darbo Kodeksas - Straipsnių Indeksas

**Šaltinis:** e-TAR (${effectiveDate})
**Straipsnių skaičius:** ${articles.length}

## Skyriai

${chapterCounts.map(c => `- **${c.name}** (${c.count} str.)`).join('\n')}

## Pilnas sąrašas

| Str. | Pavadinimas | Skyrius |
|------|-------------|---------|
${articles.sort((a, b) => a.num - b.num).map(a => `| ${a.num} | ${a.title} | ${a.skyriusTitle || '-'} |`).join('\n')}
`;
  fs.writeFileSync(path.join('data', 'darbo-kodeksas-index.md'), md);
  console.log('Generated index files: darbo-kodeksas-lookup.json, darbo-kodeksas-index.md');
}

/**
 * Check if edition has changed since last run
 */
function hasEditionChanged(editionId: string): boolean {
  const latestPath = path.join('data', 'darbo-kodeksas-latest.json');
  try {
    const data = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
    if (data.editionId === editionId) {
      console.log(`Edition ${editionId} unchanged since last run`);
      return false;
    }
    console.log(`Edition changed: ${data.editionId} → ${editionId}`);
    return true;
  } catch {
    console.log('No previous edition found, will fetch');
    return true;
  }
}

async function main() {
  const shouldIngest = process.argv.includes('--ingest');
  const forceUpdate = process.argv.includes('--force');

  console.log('=== e-TAR Labor Code Fetcher ===\n');

  // 1. Get latest edition
  const { editionId, effectiveDate } = await getLatestEditionId();
  console.log(`Edition: ${editionId}, Effective: ${effectiveDate}\n`);

  // 2. Check if update needed (skip if --force)
  if (!forceUpdate && !hasEditionChanged(editionId)) {
    console.log('No update needed. Use --force to re-fetch anyway.');
    return;
  }

  // 3. Download DOCX
  const docxBuffer = await downloadDocx(editionId);
  console.log(`Downloaded ${(docxBuffer.length / 1024).toFixed(1)} KB\n`);

  // 3. Parse and extract articles
  const { articles } = await parseDocx(docxBuffer);

  console.log(`\nExtracted ${articles.length} articles`);

  // Show sample
  console.log('\nSample articles:');
  [36, 52, 57, 126, 127].forEach(num => {
    const art = articles.find(a => a.num === num);
    if (art) {
      console.log(`\n  Art ${art.num}: ${art.title.slice(0, 50)}...`);
      console.log(`    Dalis: ${art.dalis || 'N/A'} - ${art.dalisTitle?.slice(0, 30) || 'N/A'}`);
      console.log(`    Skyrius: ${art.skyrius || 'N/A'} - ${art.skyriusTitle?.slice(0, 30) || 'N/A'}`);
      console.log(`    Skirsnis: ${art.skirsnis || 'N/A'} - ${art.skirsnisTitle?.slice(0, 30) || 'N/A'}`);
      console.log(`    References: ${art.references.length > 0 ? art.references.slice(0, 5).join(', ') + (art.references.length > 5 ? '...' : '') : 'none'}`);
    }
  });

  // 4. Save to JSON
  saveArticles(articles, editionId, effectiveDate);

  // 5. Ingest if requested
  if (shouldIngest) {
    await ingestToPinecone(articles, effectiveDate);
  } else {
    console.log('\nRun with --ingest flag to upload to Pinecone');
  }
}

main().catch(console.error);
