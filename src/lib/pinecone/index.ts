import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export function getPinecone(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

export function getIndex() {
  return getPinecone().index(process.env.PINECONE_INDEX || 'law-agent');
}

export interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata: {
    docId: string;
    docType: 'legislation' | 'nutarimas' | 'lat_ruling' | 'vdi_faq' | 'vdi_doc';
    sourceFile: string;
    chunkIndex: number;
    totalChunks: number;
    articleNumber?: number;
    articleTitle?: string;
    title?: string; // For nutarimai and vdi_doc
    // Ruling-specific fields
    caseNumber?: string;
    caseTitle?: string;
    caseSummary?: string;
    year?: string;
    month?: string;
    sourceUrl?: string;
    sourcePage?: number;
    // New LAT ruling fields
    pdfId?: string;
    summary?: string;
    // VDI FAQ fields
    question?: string;
    category?: string;
    // VDI Doc fields
    tier?: number;
    topics?: string;
  };
}

export async function searchSimilar(
  embedding: number[],
  topK: number = 10,
  filter?: Record<string, any>
): Promise<SearchResult[]> {
  const index = getIndex();

  const queryResponse = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
    filter,
  });

  return (queryResponse.matches || []).map((match) => ({
    id: match.id,
    score: match.score || 0,
    text: (match.metadata?.text as string) || '',
    metadata: {
      docId: match.metadata?.docId as string,
      docType: match.metadata?.docType as 'legislation' | 'nutarimas' | 'lat_ruling' | 'vdi_faq',
      sourceFile: match.metadata?.sourceFile as string,
      chunkIndex: match.metadata?.chunkIndex as number,
      totalChunks: match.metadata?.totalChunks as number,
      articleNumber: match.metadata?.articleNumber as number | undefined,
      articleTitle: match.metadata?.articleTitle as string | undefined,
    },
  }));
}

// Hybrid search: retrieve from legislation, LAT rulings, nutarimai, VDI FAQ, and VDI docs separately, then merge
export async function searchHybrid(
  embedding: number[],
  legislationK: number = 8,
  rulingsK: number = 4,
  nutarimaiK: number = 2,
  vdiFaqK: number = 4,
  vdiDocsK: number = 3
): Promise<SearchResult[]> {
  const index = getIndex();

  // Search all document types in parallel
  const [legislationResults, latRulingsResults, nutarimaiResults, vdiFaqResults, vdiDocsResults] = await Promise.all([
    index.query({
      vector: embedding,
      topK: legislationK,
      includeMetadata: true,
      filter: { docType: 'legislation' },
    }),
    index.query({
      vector: embedding,
      topK: rulingsK * 2, // LAT rulings - fetch more, filter by score
      includeMetadata: true,
      filter: { docType: 'lat_ruling' },
    }),
    index.query({
      vector: embedding,
      topK: nutarimaiK * 2,
      includeMetadata: true,
      filter: { docType: 'nutarimas' },
    }),
    index.query({
      vector: embedding,
      topK: vdiFaqK * 2,
      includeMetadata: true,
      filter: { docType: 'vdi_faq' },
    }),
    index.query({
      vector: embedding,
      topK: vdiDocsK * 2,
      includeMetadata: true,
      filter: { docType: 'vdi_doc' },
    }),
  ]);

  const mapResult = (match: any): SearchResult => ({
    id: match.id,
    score: match.score || 0,
    text: (match.metadata?.text as string) || '',
    metadata: {
      docId: match.metadata?.docId as string,
      docType: match.metadata?.docType as 'legislation' | 'nutarimas' | 'lat_ruling' | 'vdi_faq' | 'vdi_doc',
      sourceFile: match.metadata?.sourceFile as string,
      chunkIndex: match.metadata?.chunkIndex as number,
      totalChunks: match.metadata?.totalChunks as number,
      articleNumber: match.metadata?.articleNumber as number | undefined,
      articleTitle: match.metadata?.articleTitle as string | undefined,
      title: match.metadata?.title as string | undefined, // For nutarimai and vdi_doc
      // Ruling-specific fields
      caseNumber: match.metadata?.caseNumber as string | undefined,
      caseTitle: match.metadata?.caseTitle as string | undefined,
      caseSummary: match.metadata?.caseSummary as string | undefined,
      year: match.metadata?.year as string | undefined,
      month: match.metadata?.month as string | undefined,
      sourceUrl: match.metadata?.sourceUrl as string | undefined,
      sourcePage: match.metadata?.sourcePage as number | undefined,
      // New LAT ruling fields
      pdfId: match.metadata?.pdfId as string | undefined,
      summary: match.metadata?.summary as string | undefined,
      // VDI FAQ fields
      question: match.metadata?.question as string | undefined,
      category: match.metadata?.category as string | undefined,
      // VDI Doc fields
      tier: match.metadata?.tier as number | undefined,
      topics: match.metadata?.topics as string | undefined,
    },
  });

  const legislation = (legislationResults.matches || []).map(mapResult);

  // Include top LAT rulings without score threshold - let LLM decide relevance
  // We only have 58 quality cases, all relevant to labor law
  const latRulings = (latRulingsResults.matches || [])
    .slice(0, rulingsK)
    .map(mapResult);

  // Only include nutarimai with score > 0.65
  const nutarimai = (nutarimaiResults.matches || [])
    .filter(m => (m.score || 0) >= 0.65)
    .slice(0, nutarimaiK)
    .map(mapResult);

  // Only include VDI FAQ with score > 0.65
  const vdiFaq = (vdiFaqResults.matches || [])
    .filter(m => (m.score || 0) >= 0.65)
    .slice(0, vdiFaqK)
    .map(mapResult);

  // Only include VDI docs with score > 0.65
  const vdiDocs = (vdiDocsResults.matches || [])
    .filter(m => (m.score || 0) >= 0.65)
    .slice(0, vdiDocsK)
    .map(mapResult);

  // Merge and sort by score
  return [...legislation, ...latRulings, ...nutarimai, ...vdiFaq, ...vdiDocs].sort((a, b) => b.score - a.score);
}

// Fetch specific articles by ID
export async function fetchArticles(articleNumbers: number[]): Promise<SearchResult[]> {
  const index = getIndex();
  const ids = articleNumbers.map(n => `darbo-kodeksas-str-${n}`);

  try {
    const response = await index.fetch(ids);
    return Object.values(response.records || {})
      .filter(r => r !== undefined)
      .map((record) => ({
        id: record.id,
        score: 1.0, // Direct fetch has max relevance
        text: (record.metadata?.text as string) || '',
        metadata: {
          docId: record.metadata?.docId as string,
          docType: record.metadata?.docType as 'legislation' | 'nutarimas' | 'lat_ruling',
          sourceFile: record.metadata?.sourceFile as string,
          chunkIndex: record.metadata?.chunkIndex as number,
          totalChunks: record.metadata?.totalChunks as number,
          articleNumber: record.metadata?.articleNumber as number | undefined,
          articleTitle: record.metadata?.articleTitle as string | undefined,
        },
      }));
  } catch {
    return [];
  }
}
