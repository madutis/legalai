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
    docType: 'legislation' | 'ruling';
    sourceFile: string;
    chunkIndex: number;
    totalChunks: number;
    articleNumber?: number;
    articleTitle?: string;
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
