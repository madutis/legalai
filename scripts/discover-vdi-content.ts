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

// VDI content source URLs
const VDI_SOURCES = [
  {
    name: 'Atmintinės darbuotojams ir darbdaviams',
    url: 'https://vdi.lrv.lt/lt/darbo-teise/atmintines-darbuotojams-ir-darbdaviams/',
  },
  {
    name: 'Darbdaviams',
    url: 'https://vdi.lrv.lt/lt/darbo-teise/darbdaviams/',
  },
  {
    name: 'Darbuotojams',
    url: 'https://vdi.lrv.lt/lt/darbo-teise/darbuotojams/',
  },
];

interface ContentItem {
  id: string;
  title: string;
  type: 'pdf' | 'page';
  url: string;
  sourceUrl: string;
  tier?: number;
  reason?: string;
  topics?: string[];
  content_preview?: string;
}

interface ContentManifest {
  discovered: string;
  sources_crawled: string[];
  items: ContentItem[];
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'lt,en;q=0.5',
};

async function fetchPage(url: string): Promise<string> {
  console.log(`  Fetching: ${url}`);
  const response = await fetch(url, { headers: FETCH_HEADERS });
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

    // Use unpdf which is simpler and already in dependencies
    const { extractText } = await import('unpdf');
    const result = await extractText(new Uint8Array(buffer));

    // Result.text can be string or string[] (one per page)
    if (Array.isArray(result.text)) {
      return result.text.join('\n\n');
    }
    return result.text || '';
  } catch (error) {
    console.log(`    Warning: Failed to parse PDF: ${error}`);
    return '';
  }
}

function extractLinksFromPage(html: string, sourceUrl: string): ContentItem[] {
  const $ = cheerio.load(html);
  const items: ContentItem[] = [];
  const baseUrl = 'https://vdi.lrv.lt';

  // Extract PDF links
  $('a[href$=".pdf"]').each((_, el) => {
    const $el = $(el);
    let href = $el.attr('href') || '';
    const title = $el.text().trim() || $el.attr('title') || 'Untitled PDF';

    // Make absolute URL
    if (href.startsWith('/')) {
      href = baseUrl + href;
    } else if (!href.startsWith('http')) {
      href = new URL(href, sourceUrl).href;
    }

    // Generate ID from URL
    const id = generateId(href, title);

    items.push({
      id,
      title: cleanText(title),
      type: 'pdf',
      url: href,
      sourceUrl,
    });
  });

  // Extract topic page links (subpages under /darbo-teise/)
  $('a[href*="/darbo-teise/"]').each((_, el) => {
    const $el = $(el);
    let href = $el.attr('href') || '';
    const title = $el.text().trim();

    // Skip navigation links, PDF links, and current page
    if (!title || title.length < 5) return;
    if (href.endsWith('.pdf')) return;
    if (href === sourceUrl || href + '/' === sourceUrl) return;

    // Make absolute URL
    if (href.startsWith('/')) {
      href = baseUrl + href;
    }

    // Skip if it's the same as source or a parent path
    if (sourceUrl.startsWith(href) || href === sourceUrl) return;

    // Only include subpages, not parent sections
    const sourcePath = new URL(sourceUrl).pathname;
    const linkPath = new URL(href, baseUrl).pathname;

    // Skip if link path is shorter than source (going up)
    if (linkPath.split('/').filter(Boolean).length <= sourcePath.split('/').filter(Boolean).length - 1) {
      return;
    }

    const id = generateId(href, title);

    items.push({
      id,
      title: cleanText(title),
      type: 'page',
      url: href,
      sourceUrl,
    });
  });

  return items;
}

function generateId(url: string, title: string): string {
  // Create a slug from the title or URL
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u0100-\u017F]+/g, '-') // Keep Lithuanian chars
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  // Add hash from URL for uniqueness
  const urlHash = url.split('/').pop()?.replace('.pdf', '').slice(0, 10) || '';

  return `vdi-${slug}-${urlHash}`.replace(/--+/g, '-');
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

async function classifyContent(item: ContentItem, contentText: string, dryRun: boolean): Promise<ContentItem> {
  if (dryRun) {
    // In dry-run mode, return without classification
    return {
      ...item,
      tier: 0,
      reason: 'Dry run - not classified',
      topics: [],
      content_preview: contentText.slice(0, 500),
    };
  }

  const prompt = `You are classifying VDI (State Labor Inspectorate) guidance documents for relevance to Lithuanian accountants and bookkeepers who handle employment administration.

Tier 1 (essential - ingest): Employment contracts, working time/pay, VDU calculation, leave management, termination procedures
Tier 2 (useful - ingest): Occupational safety reporting basics, labor dispute basics
Tier 3 (skip): Detailed safety inspections, technical regulations, inspector procedures

Document title: ${item.title}
Document content (first 2000 chars): ${contentText.slice(0, 2000)}

Respond with JSON only: {"tier": 1|2|3, "reason": "brief explanation", "topics": ["topic1", "topic2"]}`;

  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const classification = JSON.parse(jsonMatch[0]);
      return {
        ...item,
        tier: classification.tier,
        reason: classification.reason,
        topics: classification.topics,
        content_preview: contentText.slice(0, 500),
      };
    }
  } catch (error) {
    console.log(`    Warning: Classification failed for ${item.title}: ${error}`);
  }

  // Default to Tier 2 if classification fails
  return {
    ...item,
    tier: 2,
    reason: 'Classification failed - defaulting to Tier 2',
    topics: [],
    content_preview: contentText.slice(0, 500),
  };
}

async function extractPageContent(url: string): Promise<string> {
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // Remove navigation, header, footer
    $('nav, header, footer, .menu, .navigation').remove();

    // Get main content
    const mainContent = $('main, article, .content, .page-content').text() || $('body').text();

    return cleanText(mainContent).slice(0, 5000);
  } catch (error) {
    console.log(`    Warning: Failed to extract page content: ${error}`);
    return '';
  }
}

async function discoverContent(dryRun: boolean): Promise<ContentManifest> {
  console.log('=== VDI Content Discovery ===\n');

  const manifest: ContentManifest = {
    discovered: new Date().toISOString(),
    sources_crawled: [],
    items: [],
  };

  const seenUrls = new Set<string>();

  // Load existing manifest to skip already processed URLs
  const manifestPath = path.join(process.cwd(), 'data', 'vdi-content-manifest.json');
  let existingManifest: ContentManifest | null = null;

  if (fs.existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      console.log(`Found existing manifest with ${existingManifest.items.length} items\n`);
      existingManifest.items.forEach(item => seenUrls.add(item.url));
    } catch {
      console.log('Could not parse existing manifest, starting fresh\n');
    }
  }

  // Crawl each source
  for (const source of VDI_SOURCES) {
    console.log(`\nCrawling: ${source.name}`);
    console.log(`URL: ${source.url}`);

    try {
      const html = await fetchPage(source.url);
      const items = extractLinksFromPage(html, source.url);

      console.log(`  Found ${items.length} links`);
      manifest.sources_crawled.push(source.url);

      // Filter out already seen URLs
      const newItems = items.filter(item => !seenUrls.has(item.url));
      console.log(`  New items: ${newItems.length}`);

      // Process each new item
      for (const item of newItems) {
        seenUrls.add(item.url);

        console.log(`\n  Processing: ${item.title.slice(0, 60)}...`);

        // Get content for classification
        let contentText = '';
        if (item.type === 'pdf') {
          contentText = await fetchPdfText(item.url);
        } else {
          contentText = await extractPageContent(item.url);
        }

        if (contentText.length < 50) {
          console.log(`    Skipping: insufficient content (${contentText.length} chars)`);
          continue;
        }

        // Classify content
        const classifiedItem = await classifyContent(item, contentText, dryRun);
        manifest.items.push(classifiedItem);

        console.log(`    Tier ${classifiedItem.tier}: ${classifiedItem.reason?.slice(0, 60)}...`);

        // Rate limiting
        if (!dryRun) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms between LLM calls
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms between fetches
      }
    } catch (error) {
      console.log(`  Error crawling ${source.name}: ${error}`);
    }
  }

  // Merge with existing manifest if present
  if (existingManifest && !dryRun) {
    // Keep existing items that weren't re-processed
    const newUrls = new Set(manifest.items.map(i => i.url));
    const keptItems = existingManifest.items.filter(i => !newUrls.has(i.url));
    manifest.items = [...keptItems, ...manifest.items];
  }

  return manifest;
}

function printSummary(manifest: ContentManifest) {
  console.log('\n=== Discovery Summary ===\n');
  console.log(`Total items: ${manifest.items.length}`);

  const tier1 = manifest.items.filter(i => i.tier === 1);
  const tier2 = manifest.items.filter(i => i.tier === 2);
  const tier3 = manifest.items.filter(i => i.tier === 3);

  console.log(`Tier 1 (essential): ${tier1.length}`);
  console.log(`Tier 2 (useful): ${tier2.length}`);
  console.log(`Tier 3 (skip): ${tier3.length}`);

  if (tier1.length > 0) {
    console.log('\n--- Tier 1 Documents ---');
    tier1.forEach(item => {
      console.log(`  [${item.type.toUpperCase()}] ${item.title}`);
      console.log(`    Topics: ${item.topics?.join(', ') || 'N/A'}`);
      console.log(`    Reason: ${item.reason}`);
    });
  }

  if (tier2.length > 0) {
    console.log('\n--- Tier 2 Documents ---');
    tier2.forEach(item => {
      console.log(`  [${item.type.toUpperCase()}] ${item.title}`);
    });
  }

  // Collect all unique topics
  const allTopics = new Set<string>();
  manifest.items.forEach(item => {
    item.topics?.forEach(t => allTopics.add(t));
  });

  console.log(`\nTopics found: ${[...allTopics].join(', ')}`);
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

  const manifest = await discoverContent(dryRun);

  printSummary(manifest);

  // Save manifest
  if (!dryRun) {
    const manifestPath = path.join(process.cwd(), 'data', 'vdi-content-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\nManifest saved to: ${manifestPath}`);
  } else {
    console.log('\n=== DRY RUN COMPLETE ===');
    console.log(`Would save manifest with ${manifest.items.length} items`);
  }
}

main().catch(console.error);
