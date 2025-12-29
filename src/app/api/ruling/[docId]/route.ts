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

    // Fetch the specific chunk by ID
    const response = await index.fetch([docId]);

    const record = response.records?.[docId];
    if (!record) {
      return NextResponse.json({ error: 'Ruling not found' }, { status: 404 });
    }

    const text = record.metadata?.text as string;
    const sourceFile = record.metadata?.sourceFile as string;

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
      text,
      isRelevantChunk: true, // Indicates this is the specific relevant excerpt
    });
  } catch (error) {
    console.error('Error fetching ruling:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ruling' },
      { status: 500 }
    );
  }
}
