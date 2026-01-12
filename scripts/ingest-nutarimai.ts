import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Initialize clients
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// Government resolutions to ingest
const NUTARIMAI = [
  {
    id: 'nutarimas-496-2017',
    title: 'Dėl Lietuvos Respublikos darbo kodekso įgyvendinimo',
    legalActId: '76731a705b4711e79198ffdb108a3753',
    versionId: 'ZNCKrBEylJ',
    description: 'DK įgyvendinimo nutarimas - specialios pertraukos, sezoninis darbas',
  },
  {
    id: 'nutarimas-1341-2002',
    title: 'Dėl valstybės valdomų įmonių vadovų darbo užmokesčio',
    legalActId: 'TAR.AF454CDF6788',
    versionId: 'uKqPfKXXmr',
    description: 'Valstybės įmonių vadovų atlyginimai',
  },
  {
    id: 'nutarimas-518-2017',
    title: 'Dėl asmenų iki aštuoniolikos metų įdarbinimo',
    legalActId: '46a43c005cd411e79198ffdb108a3753',
    versionId: 'asr',
    description: 'Nepilnamečių įdarbinimas, vaikų darbas',
  },
  {
    id: 'nutarimas-469-2017',
    title: 'Dėl nėščių, neseniai pagimdžiusių, krūtimi maitinančių darbuotojų darbo sąlygų',
    legalActId: 'eb65c040574a11e7846ef01bfffb9b64',
    versionId: 'asr',
    description: 'Nėščiųjų darbo sąlygos, motinystės apsauga',
  },
  {
    id: 'nutarimas-1118-2004',
    title: 'Dėl Nelaimingų atsitikimų darbe tyrimo ir apskaitos nuostatų',
    legalActId: 'TAR.AF1B122D7145',
    versionId: 'asr',
    description: 'Nelaimingi atsitikimai darbe, tyrimas, apskaita',
  },
  {
    id: 'nutarimas-487-2004',
    title: 'Dėl Profesinių ligų tyrimo ir apskaitos nuostatų',
    legalActId: 'TAR.04551A50A76D',
    versionId: 'asr',
    description: 'Profesinės ligos, tyrimas, apskaita',
  },
  {
    id: 'nutarimas-86-2001',
    title: 'Dėl Ligos ir motinystės socialinio draudimo išmokų nuostatų',
    legalActId: 'TAR.4707C1616570',
    versionId: 'asr',
    description: 'Ligos išmokos, motinystės išmokos, nedarbingumas',
  },
  {
    id: 'nutarimas-1656-2004',
    title: 'Dėl Nedarbo socialinio draudimo išmokų nuostatų',
    legalActId: 'TAR.9A230138C75D',
    versionId: 'asr',
    description: 'Nedarbo išmokos, bedarbio pašalpa',
  },
  {
    id: 'nutarimas-309-2004',
    title: 'Dėl Nelaimingų atsitikimų darbe ir profesinių ligų socialinio draudimo išmokų',
    legalActId: 'TAR.818206FCA97A',
    versionId: 'syYCnejkal',
    description: 'Draudimo išmokos dėl nelaimingų atsitikimų',
  },
  {
    id: 'nutarimas-495-2017',
    title: 'Dėl Garantinio fondo nuostatų',
    legalActId: '6d2008e05b4011e79198ffdb108a3753',
    versionId: 'asr',
    description: 'Garantinis fondas, bankrotas, darbuotojų reikalavimai',
  },
  {
    id: 'nutarimas-576-2017',
    title: 'Dėl Ilgalaikio darbo išmokų fondo nuostatų',
    legalActId: '8609c09067bf11e7827cd63159af616c',
    versionId: 'asr',
    description: 'Ilgalaikio darbo išmokos',
  },
  {
    id: 'nutarimas-115-2003',
    title: 'Dėl Darbo sutarties pavyzdinių formų',
    legalActId: 'TAR.ACECA7410B1E',
    versionId: 'jMZqGySqgO',
    description: 'Darbo sutarties forma, šablonas',
  },
  {
    id: 'nutarimas-166-2004',
    title: 'Dėl Darbo ginčų komisijos posėdžio protokolo formos',
    legalActId: 'TAR.8C415293D6EE',
    versionId: 'asr',
    description: 'DGK protokolas, darbo ginčai',
  },
];

async function fetchPdfFromEtar(legalActId: string): Promise<Buffer | null> {
  try {
    // Step 1: Fetch HTML page to get the dynamic PDF link
    const htmlUrl = `https://www.e-tar.lt/portal/lt/legalAct/${legalActId}/asr`;
    console.log(`  Fetching HTML: ${htmlUrl}`);

    const htmlResponse = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!htmlResponse.ok) {
      console.log(`  HTML fetch failed: ${htmlResponse.status}`);
      return null;
    }

    const html = await htmlResponse.text();

    // Extract PDF link from HTML
    const pdfMatch = html.match(/href="([^"]*ISO_PDF[^"]*)"/);
    if (!pdfMatch) {
      console.log(`  No PDF link found in HTML`);
      return null;
    }

    const pdfPath = pdfMatch[1];
    const pdfUrl = pdfPath.startsWith('http') ? pdfPath : `https://www.e-tar.lt${pdfPath}`;
    console.log(`  Found PDF link: ${pdfUrl}`);

    // Step 2: Fetch the actual PDF
    const pdfResponse = await fetch(pdfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
      },
      redirect: 'follow',
    });

    if (!pdfResponse.ok) {
      console.log(`  PDF fetch failed: ${pdfResponse.status}`);
      return null;
    }

    const contentType = pdfResponse.headers.get('content-type') || '';
    if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      console.log(`  Unexpected content type: ${contentType}`);
      return null;
    }

    const buffer = await pdfResponse.arrayBuffer();
    if (buffer.byteLength < 1000) {
      console.log(`  PDF too small (${buffer.byteLength} bytes), likely error`);
      return null;
    }

    return Buffer.from(buffer);
  } catch (error) {
    console.log(`  Error: ${error}`);
    return null;
  }
}

async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const uint8Array = new Uint8Array(pdfBuffer);
  const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    text += pageText + '\n\n';
  }

  return text;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

function chunkText(text: string, maxChunkSize: number = 1500): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function ingestNutarimas(nutarimas: typeof NUTARIMAI[0], index: ReturnType<Pinecone['index']>) {
  console.log(`\nProcessing: ${nutarimas.title}`);

  // Fetch PDF
  const pdfBuffer = await fetchPdfFromEtar(nutarimas.legalActId);

  if (!pdfBuffer) {
    console.log(`  ❌ Could not fetch PDF for ${nutarimas.id}`);
    return 0;
  }

  console.log(`  ✓ Downloaded PDF (${pdfBuffer.length} bytes)`);

  // Extract text
  let text: string;
  try {
    text = await extractTextFromPdf(pdfBuffer);
    console.log(`  ✓ Extracted text (${text.length} chars)`);
  } catch (error) {
    console.log(`  ❌ Failed to extract text: ${error}`);
    return 0;
  }

  // Chunk text
  const chunks = chunkText(text);
  console.log(`  ✓ Created ${chunks.length} chunks`);

  // Generate embeddings and upsert
  const vectors = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.length < 50) continue; // Skip very short chunks

    try {
      const embedding = await generateEmbedding(chunk);
      vectors.push({
        id: `${nutarimas.id}-chunk-${i}`,
        values: embedding,
        metadata: {
          docId: nutarimas.id,
          docType: 'nutarimas',
          title: nutarimas.title,
          description: nutarimas.description,
          text: chunk.slice(0, 8000), // Pinecone metadata limit
          chunkIndex: i,
          sourceFile: `e-tar.lt/${nutarimas.legalActId}`,
        },
      });
    } catch (error) {
      console.log(`  ⚠ Failed to embed chunk ${i}: ${error}`);
    }

    // Rate limiting
    if (i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Upsert to Pinecone
  if (vectors.length > 0) {
    await index.upsert(vectors);
    console.log(`  ✓ Upserted ${vectors.length} vectors`);
  }

  return vectors.length;
}

async function main() {
  console.log('=== Nutarimai Ingestion Script ===\n');

  // Check environment
  if (!process.env.PINECONE_API_KEY || !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('Missing required environment variables:');
    console.error('- PINECONE_API_KEY');
    console.error('- GOOGLE_GENERATIVE_AI_API_KEY');
    process.exit(1);
  }

  const index = pinecone.index(process.env.PINECONE_INDEX || 'law-agent');
  let totalVectors = 0;

  for (const nutarimas of NUTARIMAI) {
    try {
      const count = await ingestNutarimas(nutarimas, index);
      totalVectors += count;
    } catch (error) {
      console.error(`Failed to process ${nutarimas.id}:`, error);
    }
  }

  console.log(`\n=== Done! Total vectors added: ${totalVectors} ===`);
}

main().catch(console.error);
