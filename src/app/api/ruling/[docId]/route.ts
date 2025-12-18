import { NextRequest, NextResponse } from 'next/server';
import { getIndex } from '@/lib/pinecone';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await params;

    if (!docId) {
      return NextResponse.json({ error: 'docId is required' }, { status: 400 });
    }

    const index = getIndex();

    // Query for all chunks with this docId
    // We'll use a dummy vector and filter by metadata
    const dummyVector = new Array(768).fill(0);

    const response = await index.query({
      vector: dummyVector,
      topK: 100, // Max chunks per ruling
      includeMetadata: true,
      filter: { docId: { $eq: docId } },
    });

    if (!response.matches || response.matches.length === 0) {
      return NextResponse.json({ error: 'Ruling not found' }, { status: 404 });
    }

    // Sort by chunkIndex and concatenate
    const chunks = response.matches
      .sort((a, b) => {
        const aIndex = (a.metadata?.chunkIndex as number) || 0;
        const bIndex = (b.metadata?.chunkIndex as number) || 0;
        return aIndex - bIndex;
      })
      .map((m) => m.metadata?.text as string)
      .filter(Boolean);

    const fullText = chunks.join('\n\n');
    const sourceFile = response.matches[0].metadata?.sourceFile as string;

    // Extract year and case info from filename
    const yearMatch = sourceFile?.match(/(\d{4})/);
    const caseMatch = sourceFile?.match(/LAT_\d{4}_([^.]+)/);

    const title = yearMatch
      ? `LAT ${yearMatch[1]}${caseMatch ? ` ${caseMatch[1]}` : ''}`
      : docId;

    return NextResponse.json({
      docId,
      title,
      sourceFile,
      text: fullText,
      chunkCount: chunks.length,
    });
  } catch (error) {
    console.error('Error fetching ruling:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ruling' },
      { status: 500 }
    );
  }
}
