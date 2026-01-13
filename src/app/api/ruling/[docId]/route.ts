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

    const metadata = record.metadata as Record<string, unknown>;
    const text = metadata?.text as string;
    const sourceFile = metadata?.sourceFile as string;
    const docType = metadata?.docType as string;
    const caseNumber = metadata?.caseNumber as string | undefined;
    const caseTitle = metadata?.caseTitle as string | undefined;
    const caseSummary = metadata?.caseSummary as string | undefined;
    const sourceUrl = metadata?.sourceUrl as string | undefined;
    const sourcePage = metadata?.sourcePage as number | undefined;

    // Build title based on available data
    let title = docId;
    if (caseNumber) {
      title = `LAT Nr. ${caseNumber}`;
    } else if (docType === 'nutarimas') {
      const nutMatch = docId.match(/nutarimas-(\d+)-(\d+)/);
      title = nutMatch ? `Nutarimas Nr. ${nutMatch[1]} (${nutMatch[2]})` : docId;
    } else {
      const yearMatch = sourceFile?.match(/(\d{4})/);
      const caseMatch = sourceFile?.match(/LAT_\d{4}_([^.]+)/);
      title = yearMatch
        ? `LAT ${yearMatch[1]}${caseMatch ? ` ${caseMatch[1]}` : ''}`
        : docId;
    }

    return NextResponse.json({
      docId,
      docType,
      title,
      caseTitle,
      caseSummary,
      sourceFile,
      sourceUrl,
      sourcePage,
      text,
    });
  } catch (error) {
    console.error('Error fetching ruling:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ruling' },
      { status: 500 }
    );
  }
}
