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
    docType: 'legislation' | 'ruling' | 'nutarimas';
    sourceFile: string;
    chunkIndex: number;
    totalChunks: number;
    articleNumber?: number;
    articleTitle?: string;
    title?: string; // For nutarimai
    // Ruling-specific fields
    caseNumber?: string;
    caseTitle?: string;
    caseSummary?: string;
    year?: string;
    month?: string;
    sourceUrl?: string;
    sourcePage?: number;
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
      docType: match.metadata?.docType as 'legislation' | 'ruling',
      sourceFile: match.metadata?.sourceFile as string,
      chunkIndex: match.metadata?.chunkIndex as number,
      totalChunks: match.metadata?.totalChunks as number,
      articleNumber: match.metadata?.articleNumber as number | undefined,
      articleTitle: match.metadata?.articleTitle as string | undefined,
    },
  }));
}

// Hybrid search: retrieve from legislation, rulings, and nutarimai separately, then merge
export async function searchHybrid(
  embedding: number[],
  legislationK: number = 8,
  rulingsK: number = 4,
  nutarimaiK: number = 2
): Promise<SearchResult[]> {
  const index = getIndex();

  // Search all document types in parallel
  const [legislationResults, rulingsResults, nutarimaiResults] = await Promise.all([
    index.query({
      vector: embedding,
      topK: legislationK,
      includeMetadata: true,
      filter: { docType: 'legislation' },
    }),
    index.query({
      vector: embedding,
      topK: rulingsK * 2, // Fetch more, then filter by score
      includeMetadata: true,
      filter: { docType: 'ruling' },
    }),
    index.query({
      vector: embedding,
      topK: nutarimaiK * 2,
      includeMetadata: true,
      filter: { docType: 'nutarimas' },
    }),
  ]);

  const mapResult = (match: any): SearchResult => ({
    id: match.id,
    score: match.score || 0,
    text: (match.metadata?.text as string) || '',
    metadata: {
      docId: match.metadata?.docId as string,
      docType: match.metadata?.docType as 'legislation' | 'ruling',
      sourceFile: match.metadata?.sourceFile as string,
      chunkIndex: match.metadata?.chunkIndex as number,
      totalChunks: match.metadata?.totalChunks as number,
      articleNumber: match.metadata?.articleNumber as number | undefined,
      articleTitle: match.metadata?.articleTitle as string | undefined,
      title: match.metadata?.title as string | undefined, // For nutarimai
      // Ruling-specific fields
      caseNumber: match.metadata?.caseNumber as string | undefined,
      caseTitle: match.metadata?.caseTitle as string | undefined,
      caseSummary: match.metadata?.caseSummary as string | undefined,
      year: match.metadata?.year as string | undefined,
      month: match.metadata?.month as string | undefined,
      sourceUrl: match.metadata?.sourceUrl as string | undefined,
      sourcePage: match.metadata?.sourcePage as number | undefined,
    },
  });

  const legislation = (legislationResults.matches || []).map(mapResult);

  // Only include rulings with score > 0.68 (filters out irrelevant matches)
  const rulings = (rulingsResults.matches || [])
    .filter(m => (m.score || 0) >= 0.68)
    .slice(0, rulingsK)
    .map(mapResult);

  // Only include nutarimai with score > 0.65
  const nutarimai = (nutarimaiResults.matches || [])
    .filter(m => (m.score || 0) >= 0.65)
    .slice(0, nutarimaiK)
    .map(mapResult);

  // Merge and sort by score
  return [...legislation, ...rulings, ...nutarimai].sort((a, b) => b.score - a.score);
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
          docType: record.metadata?.docType as 'legislation' | 'ruling',
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
