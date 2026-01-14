import { NextRequest, NextResponse } from 'next/server';
import { getIndex } from '@/lib/pinecone';
import { getCaseById, getPdfById } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await params;

    if (!docId) {
      return NextResponse.json({ error: 'docId is required' }, { status: 400 });
    }

    // Check if this is a new LAT ruling (stored in SQLite)
    // New IDs look like: "2024-kovas-e3K-3-68-378-2024"
    const isNewLatRuling = /^\d{4}-[a-z]+-/.test(docId);

    if (isNewLatRuling) {
      // Fetch from SQLite database
      const latCase = getCaseById(docId);

      if (!latCase) {
        return NextResponse.json({ error: 'Ruling not found' }, { status: 404 });
      }

      // Get PDF URL from database
      const pdf = getPdfById(latCase.pdf_id);
      const sourceUrl = pdf?.url || null;

      return NextResponse.json({
        docId: latCase.id,
        docType: 'lat_ruling',
        title: latCase.case_number
          ? `LAT Nr. ${latCase.case_number}`
          : `LAT ${latCase.pdf_id}`,
        caseTitle: latCase.title,
        caseSummary: latCase.summary,
        sourceFile: latCase.pdf_id,
        sourceUrl,
        sourcePage: latCase.page_start,
        text: latCase.full_text,
      });
    }

    // Fall back to Pinecone for old data (nutarimai, old rulings)
    const index = getIndex();

    // For nutarimai, always fetch the first chunk (intro/title) for better content
    let fetchId = docId;
    if (docId.includes('nutarimas-') && docId.includes('-chunk-')) {
      // Extract base ID and fetch chunk-0 and chunk-1 for better content
      const baseId = docId.replace(/-chunk-\d+$/, '');
      const introIds = [`${baseId}-chunk-0`, `${baseId}-chunk-1`, docId];
      const introResponse = await index.fetch(introIds);

      // Find first chunk with substantial content
      for (const id of introIds) {
        const rec = introResponse.records?.[id];
        if (rec && (rec.metadata?.text as string)?.length > 100) {
          fetchId = id;
          break;
        }
      }
    }

    // Fetch the specific chunk by ID
    const response = await index.fetch([fetchId]);

    const record = response.records?.[fetchId];
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
