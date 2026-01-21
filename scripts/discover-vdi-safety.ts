import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// Lazy-initialized clients (for dry-run support)
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
  }
  return genAI;
}

// VDI Methodological Recommendations source
const VDI_MR_URL = 'https://www.vdi.lt/Forms/MR_grid.aspx';
const VDI_BASE_URL = 'https://www.vdi.lt';

// Safety-relevant keywords for filtering
const TIER1_KEYWORDS = [
  'instruktav', // instruktavimas, instruktavimo
  'nuotolin', // nuotolinis darbas
  'smurt', // smurtas, psichologinis smurtas
  'nelaiming', // nelaimingas atsitikimas
  'atsitik', // atsitikimas
  'moky', // mokymas, mokymo
];

const TIER2_KEYWORDS = [
  'saugos',
  'sveikat', // sveikatos
  'rizik', // rizikos
  'darbo viet', // darbo vieta
  'higienos',
  'profesin', // profesine liga
];

interface SafetyDocument {
  id: string;
  title: string;
  url: string;
  date: string;
  category: string;
  keywords?: string;
  tier?: number;
  reason?: string;
  topics?: string[];
  content_preview?: string;
}

interface SafetyManifest {
  discovered: string;
  source_url: string;
  total_documents_scanned: number;
  items: SafetyDocument[];
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'lt,en;q=0.5',
};

async function fetchPage(url: string, postData?: URLSearchParams): Promise<string> {
  const options: RequestInit = {
    headers: FETCH_HEADERS,
  };

  if (postData) {
    options.method = 'POST';
    options.headers = {
      ...FETCH_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    options.body = postData.toString();
  }

  console.log(`  Fetching: ${url}${postData ? ' (POST)' : ''}`);
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function fetchPdfText(url: string): Promise<string> {
  console.log(`  Downloading PDF: ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        ...FETCH_HEADERS,
        'Accept': 'application/pdf,*/*',
      },
    });

    if (!response.ok) {
      console.log(`    Warning: Failed to download PDF: ${response.status}`);
      return '';
    }

    const buffer = await response.arrayBuffer();
    const { extractText } = await import('unpdf');
    const result = await extractText(new Uint8Array(buffer));

    if (Array.isArray(result.text)) {
      return result.text.join('\n\n');
    }
    return result.text || '';
  } catch (error) {
    console.log(`    Warning: Failed to parse PDF: ${error}`);
    return '';
  }
}

function extractDocumentsFromPage(html: string): { docs: SafetyDocument[]; viewState: string; eventValidation: string } {
  const $ = cheerio.load(html);
  const docs: SafetyDocument[] = [];

  // Extract ASP.NET state for pagination
  const viewState = $('#__VIEWSTATE').val() as string || '';
  const eventValidation = $('#__EVENTVALIDATION').val() as string || '';

  // Parse the RadGrid table
  // The table is inside RadGrid2 - look for data rows
  $('table.rgMasterTable tbody tr').each((_, row) => {
    const $row = $(row);

    // Skip header rows
    if ($row.hasClass('rgHeader') || $row.hasClass('rgFilterRow')) return;

    const cells = $row.find('td');
    if (cells.length < 4) return;

    const category = $(cells[0]).text().trim();
    const titleCell = $(cells[1]);
    const title = titleCell.text().trim();
    const keywords = $(cells[2]).text().trim();
    const date = $(cells[3]).text().trim();

    // Get PDF link - look in the link cell
    const linkCell = $(cells[4]);
    let pdfUrl = linkCell.find('a').attr('href') || '';

    // Also check if title cell has link
    if (!pdfUrl) {
      pdfUrl = titleCell.find('a').attr('href') || '';
    }

    if (!pdfUrl || !title) return;

    // Make absolute URL
    if (pdfUrl.startsWith('../')) {
      // Relative to /Forms/ directory
      pdfUrl = VDI_BASE_URL + '/' + pdfUrl.replace('../', '');
    } else if (pdfUrl.startsWith('/')) {
      pdfUrl = VDI_BASE_URL + pdfUrl;
    } else if (!pdfUrl.startsWith('http')) {
      pdfUrl = VDI_BASE_URL + '/Forms/' + pdfUrl;
    }

    // Generate ID
    const id = generateId(title, date);

    docs.push({
      id,
      title,
      url: pdfUrl,
      date,
      category,
      keywords,
    });
  });

  return { docs, viewState, eventValidation };
}

function generateId(title: string, date: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  const dateSlug = date.replace(/\//g, '-').slice(0, 10);
  return `safety-${slug}-${dateSlug}`.replace(/--+/g, '-');
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
}

function filterSafetyRelevant(docs: SafetyDocument[]): SafetyDocument[] {
  return docs.filter(doc => {
    const searchText = `${doc.title} ${doc.keywords || ''} ${doc.category}`;
    return matchesKeywords(searchText, [...TIER1_KEYWORDS, ...TIER2_KEYWORDS]);
  });
}

async function classifyDocument(doc: SafetyDocument, contentText: string, dryRun: boolean): Promise<SafetyDocument> {
  if (dryRun) {
    // Preliminary tier based on keywords
    const searchText = `${doc.title} ${doc.keywords || ''}`;
    const isTier1 = matchesKeywords(searchText, TIER1_KEYWORDS);

    return {
      ...doc,
      tier: isTier1 ? 1 : 2,
      reason: 'Dry run - keyword-based preliminary classification',
      topics: [],
      content_preview: contentText.slice(0, 500),
    };
  }

  const prompt = `You are classifying VDI (State Labor Inspectorate) occupational safety guidance documents for relevance to Lithuanian employers who need practical workplace safety guidance.

Tier 1 (essential - ingest):
- Employee safety training/instruction procedures (instruktavimas)
- Remote work safety requirements (nuotolinis darbas)
- Harassment/violence prevention (smurtas, psichologinis smurtas)
- Workplace accident investigation (nelaimingas atsitikimas)
- General safety training requirements (mokymas)

Tier 2 (useful - ingest):
- General workplace safety guidance
- Risk assessment basics
- Occupational health basics
- Workplace hygiene standards

Tier 3 (skip):
- Highly industry-specific technical standards (chemicals, construction equipment specs)
- Detailed inspection procedures for inspectors
- Legal procedure documents for litigation
- Statistical reports

Document title: ${doc.title}
Document category: ${doc.category}
Document keywords: ${doc.keywords || 'N/A'}
Document content (first 2000 chars): ${contentText.slice(0, 2000)}

Respond with JSON only: {"tier": 1|2|3, "reason": "brief explanation", "topics": ["topic1", "topic2"]}`;

  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const classification = JSON.parse(jsonMatch[0]);
      return {
        ...doc,
        tier: classification.tier,
        reason: classification.reason,
        topics: classification.topics,
        content_preview: contentText.slice(0, 500),
      };
    }
  } catch (error) {
    console.log(`    Warning: Classification failed for ${doc.title}: ${error}`);
  }

  // Default to Tier 2 if classification fails
  return {
    ...doc,
    tier: 2,
    reason: 'Classification failed - defaulting to Tier 2',
    topics: [],
    content_preview: contentText.slice(0, 500),
  };
}

async function discoverSafetyDocuments(dryRun: boolean): Promise<SafetyManifest> {
  console.log('=== VDI Safety Documents Discovery ===\n');
  console.log(`Source: ${VDI_MR_URL}\n`);

  const manifest: SafetyManifest = {
    discovered: new Date().toISOString(),
    source_url: VDI_MR_URL,
    total_documents_scanned: 0,
    items: [],
  };

  const allDocs: SafetyDocument[] = [];
  const seenUrls = new Set<string>();
  let currentPage = 1;
  const maxPages = 25; // 245 docs / 10 per page

  // Fetch first page
  console.log(`Fetching page ${currentPage}...`);
  let html = await fetchPage(VDI_MR_URL);
  let { docs, viewState, eventValidation } = extractDocumentsFromPage(html);
  for (const doc of docs) {
    if (!seenUrls.has(doc.url)) {
      seenUrls.add(doc.url);
      allDocs.push(doc);
    }
  }
  console.log(`  Found ${docs.length} documents on page ${currentPage}`);

  // Fetch subsequent pages using ASP.NET postback
  while (currentPage < maxPages && viewState) {
    currentPage++;
    console.log(`Fetching page ${currentPage}...`);

    try {
      const postData = new URLSearchParams();
      postData.append('__VIEWSTATE', viewState);
      postData.append('__EVENTVALIDATION', eventValidation);
      // Pagination control number formula: 02 + (page - 1) * 2
      // Page 1 = ctl02, Page 2 = ctl04, Page 3 = ctl06, etc.
      const ctlNum = 2 + (currentPage - 1) * 2;
      postData.append('__EVENTTARGET', 'ctl00$ContentPlaceHolder1$RadGrid2$ctl00$ctl03$ctl01$ctl' + String(ctlNum).padStart(2, '0'));
      postData.append('__EVENTARGUMENT', '');

      html = await fetchPage(VDI_MR_URL, postData);
      const result = extractDocumentsFromPage(html);

      if (result.docs.length === 0) {
        console.log(`  No documents found, stopping pagination`);
        break;
      }

      // Add only new documents (deduplicate)
      let newCount = 0;
      for (const doc of result.docs) {
        if (!seenUrls.has(doc.url)) {
          seenUrls.add(doc.url);
          allDocs.push(doc);
          newCount++;
        }
      }
      if (newCount === 0) {
        console.log(`  All ${result.docs.length} documents already seen, stopping pagination`);
        break;
      }
      viewState = result.viewState;
      eventValidation = result.eventValidation;
      console.log(`  Found ${result.docs.length} documents on page ${currentPage}`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`  Error fetching page ${currentPage}: ${error}`);
      break;
    }
  }

  manifest.total_documents_scanned = allDocs.length;
  console.log(`\nTotal documents scanned: ${allDocs.length}`);

  // Filter for safety-relevant documents
  const safetyRelevant = filterSafetyRelevant(allDocs);
  console.log(`Safety-relevant documents (keyword match): ${safetyRelevant.length}\n`);

  // Process and classify each safety-relevant document
  for (const doc of safetyRelevant) {
    console.log(`\nProcessing: ${doc.title.slice(0, 60)}...`);

    // Fetch PDF content for classification
    const contentText = await fetchPdfText(doc.url);

    if (contentText.length < 50) {
      console.log(`  Skipping: insufficient content (${contentText.length} chars)`);
      continue;
    }

    // Classify with LLM
    const classifiedDoc = await classifyDocument(doc, contentText, dryRun);
    manifest.items.push(classifiedDoc);

    console.log(`  Tier ${classifiedDoc.tier}: ${classifiedDoc.reason?.slice(0, 60)}...`);

    // Rate limiting
    if (!dryRun) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return manifest;
}

function printSummary(manifest: SafetyManifest) {
  console.log('\n=== Discovery Summary ===\n');
  console.log(`Total documents scanned: ${manifest.total_documents_scanned}`);
  console.log(`Safety-relevant items: ${manifest.items.length}`);

  const tier1 = manifest.items.filter(i => i.tier === 1);
  const tier2 = manifest.items.filter(i => i.tier === 2);
  const tier3 = manifest.items.filter(i => i.tier === 3);

  console.log(`\nTier 1 (essential): ${tier1.length}`);
  console.log(`Tier 2 (useful): ${tier2.length}`);
  console.log(`Tier 3 (skip): ${tier3.length}`);

  if (tier1.length > 0) {
    console.log('\n--- Tier 1 Documents ---');
    tier1.forEach(item => {
      console.log(`  ${item.title}`);
      console.log(`    Topics: ${item.topics?.join(', ') || 'N/A'}`);
      console.log(`    Reason: ${item.reason}`);
    });
  }

  if (tier2.length > 0) {
    console.log('\n--- Tier 2 Documents ---');
    tier2.forEach(item => {
      console.log(`  ${item.title}`);
    });
  }

  // Collect all unique topics
  const allTopics = new Set<string>();
  manifest.items.forEach(item => {
    item.topics?.forEach(t => allTopics.add(t));
  });

  if (allTopics.size > 0) {
    console.log(`\nTopics found: ${[...allTopics].join(', ')}`);
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('DRY RUN MODE: Will discover but not classify with LLM\n');
  }

  // Check environment (not needed for dry run)
  if (!dryRun && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
    process.exit(1);
  }

  const manifest = await discoverSafetyDocuments(dryRun);

  printSummary(manifest);

  // Save manifest
  if (!dryRun) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const manifestPath = path.join(dataDir, 'vdi-safety-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\nManifest saved to: ${manifestPath}`);
  } else {
    console.log('\n=== DRY RUN COMPLETE ===');
    console.log(`Would save manifest with ${manifest.items.length} items`);
  }
}

main().catch(console.error);
