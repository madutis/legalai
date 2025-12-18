import { NextRequest, NextResponse } from 'next/server';
import { getIndex } from '@/lib/pinecone';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleNumber: string }> }
) {
  try {
    const { articleNumber } = await params;
    const num = parseInt(articleNumber);

    if (isNaN(num) || num < 1 || num > 264) {
      return NextResponse.json({ error: 'Invalid article number' }, { status: 400 });
    }

    const index = getIndex();

    // Fetch the article directly by ID
    const id = `darbo-kodeksas-str-${num}`;
    const response = await index.fetch([id]);

    const record = response.records?.[id];
    if (!record) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const text = (record.metadata?.text as string) || '';
    const articleTitle = (record.metadata?.articleTitle as string) || '';

    return NextResponse.json({
      articleNumber: num,
      title: articleTitle || `${num} straipsnis`,
      text,
      eTarUrl: `https://www.e-tar.lt/portal/lt/legalAct/f6d686707e7011e6b969d7ae07280e89/asr#part_${num}`,
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}
