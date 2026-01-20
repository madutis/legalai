import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';

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

const VDI_FAQ_URL = 'https://vdi.lrv.lt/lt/dazniausiai-uzduodami-klausimai/';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

async function fetchVdiFaqPage(): Promise<string> {
  console.log(`Fetching VDI FAQ page: ${VDI_FAQ_URL}`);

  const response = await fetch(VDI_FAQ_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'lt,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch VDI FAQ page: ${response.status}`);
  }

  return response.text();
}

function parseVdiFaqHtml(html: string): FAQItem[] {
  const $ = cheerio.load(html);
  const faqItems: FAQItem[] = [];
  const currentCategory = 'VDI DUK'; // Default category

  // The VDI FAQ page uses a nested accordion structure:
  // - Top-level accordions (accordion-1, etc.) are categories
  // - Nested sub-accordions (accordion-X-sub-Y) are Q&A pairs
  // - Questions are in <a class="accordion-links accordion-links--nested">
  // - Answers are in <div class="accordion-panels"> following the question link

  // First, process top-level accordion headers to get categories
  $('a.accordion-links.js-accordion-links-individual').each((_, categoryLink) => {
    const $categoryLink = $(categoryLink);
    const categoryText = $categoryLink.text().trim();
    const categoryId = $categoryLink.attr('href')?.replace('#', '');

    if (categoryText && categoryId) {
      // This is a category header
      const categoryPanelSelector = `#${categoryId}`;
      const $categoryPanel = $(categoryPanelSelector);

      // Find all Q&A pairs within this category
      $categoryPanel.find('a.accordion-links--nested').each((_, questionLink) => {
        const $questionLink = $(questionLink);
        const question = $questionLink.text().trim();
        const panelId = $questionLink.attr('href')?.replace('#', '');

        if (question && panelId) {
          // Find the answer panel
          const $answerPanel = $(`#${panelId}`);
          const answer = $answerPanel.text().trim();

          if (question.length > 10 && answer.length > 20) {
            faqItems.push({
              question: cleanText(question),
              answer: cleanText(answer),
              category: cleanText(categoryText),
            });
          }
        }
      });
    }
  });

  // If the above didn't work, try simpler approach: find all nested accordion links
  if (faqItems.length < 10) {
    console.log('  Trying direct sub-accordion parsing...');

    $('a.accordion-links--nested').each((_, questionLink) => {
      const $questionLink = $(questionLink);
      const question = $questionLink.text().trim();
      const panelId = $questionLink.attr('href')?.replace('#', '');

      if (question && panelId && question.length > 10) {
        // Find the answer panel by ID
        const $answerPanel = $(`#${panelId}`);
        const answer = $answerPanel.text().trim();

        if (answer.length > 20) {
          // Try to find category by looking at parent accordion
          let category = currentCategory;
          const $parent = $questionLink.closest('.accordion-panels');
          if ($parent.length) {
            const parentId = $parent.attr('id');
            if (parentId) {
              // Find the link that controls this parent panel
              const $parentLink = $(`a[href="#${parentId}"]`);
              if ($parentLink.length && !$parentLink.hasClass('accordion-links--nested')) {
                category = cleanText($parentLink.text());
              }
            }
          }

          faqItems.push({
            question: cleanText(question),
            answer: cleanText(answer),
            category: category,
          });
        }
      }
    });
  }

  // Alternative: look for any accordion pattern with id containing "sub"
  if (faqItems.length < 10) {
    console.log('  Trying ID-based sub-accordion parsing...');

    $('[id^="accordion-"][id*="-sub-"]').each((_, panel) => {
      const $panel = $(panel);
      const panelId = $panel.attr('id');

      // Skip header elements
      if (panelId?.includes('-header')) return;

      // Find the corresponding header link
      const $headerLink = $(`#${panelId}-header`);
      if ($headerLink.length) {
        const question = $headerLink.text().trim();
        const answer = $panel.text().trim();

        if (question.length > 10 && answer.length > 20) {
          faqItems.push({
            question: cleanText(question),
            answer: cleanText(answer),
            category: currentCategory,
          });
        }
      }
    });
  }

  // Deduplicate by question
  const seen = new Set<string>();
  return faqItems.filter(item => {
    const key = item.question.toLowerCase().slice(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function ingestVdiFaq(faqItems: FAQItem[], index: ReturnType<Pinecone['index']>, dryRun: boolean) {
  console.log(`\nProcessing ${faqItems.length} FAQ items...`);

  const vectors = [];

  for (let i = 0; i < faqItems.length; i++) {
    const item = faqItems[i];

    // Combine question and answer for embedding
    const textForEmbedding = `Klausimas: ${item.question}\n\nAtsakymas: ${item.answer}`;

    console.log(`Processing ${i + 1}/${faqItems.length}: ${item.question.slice(0, 60)}...`);

    if (!dryRun) {
      try {
        const embedding = await generateEmbedding(textForEmbedding);

        vectors.push({
          id: `vdi-faq-${i}`,
          values: embedding,
          metadata: {
            docId: `vdi-faq-${i}`,
            docType: 'vdi_faq',
            question: item.question.slice(0, 8000),
            text: item.answer.slice(0, 8000), // For retrieval
            category: item.category.slice(0, 500),
            sourceUrl: VDI_FAQ_URL,
          },
        });
      } catch (error) {
        console.log(`  Warning: Failed to embed FAQ item ${i}: ${error}`);
      }

      // Rate limiting: 100ms delay every 5 items
      if ((i + 1) % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Upsert to Pinecone in batches
  if (!dryRun && vectors.length > 0) {
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
  console.log('=== VDI FAQ Ingestion Script ===\n');

  // Check for --dry-run flag
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('DRY RUN MODE: Will parse but not upsert to Pinecone\n');
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

  // Fetch and parse VDI FAQ
  const html = await fetchVdiFaqPage();
  console.log(`Fetched HTML (${html.length} bytes)`);

  const faqItems = parseVdiFaqHtml(html);
  console.log(`\nParsed ${faqItems.length} FAQ items\n`);

  if (faqItems.length === 0) {
    console.error('No FAQ items found. Page structure may have changed.');
    process.exit(1);
  }

  // Log sample items
  console.log('Sample FAQ items:');
  for (let i = 0; i < Math.min(3, faqItems.length); i++) {
    console.log(`\n${i + 1}. [${faqItems[i].category}]`);
    console.log(`   Q: ${faqItems[i].question.slice(0, 100)}...`);
    console.log(`   A: ${faqItems[i].answer.slice(0, 100)}...`);
  }

  if (dryRun) {
    console.log(`\n=== DRY RUN COMPLETE ===`);
    console.log(`Would ingest ${faqItems.length} FAQ items`);

    // Log all categories found
    const categories = [...new Set(faqItems.map(f => f.category))];
    console.log(`\nCategories found (${categories.length}):`);
    categories.forEach(c => console.log(`  - ${c.slice(0, 80)}`));

    return;
  }

  // Ingest to Pinecone
  const index = getPinecone().index(process.env.PINECONE_INDEX || 'law-agent');
  const count = await ingestVdiFaq(faqItems, index, dryRun);

  console.log(`\n=== Done! Total vectors added: ${count} ===`);
}

main().catch(console.error);
