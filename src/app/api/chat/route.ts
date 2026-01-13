import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding, streamRAGResponse, ChatMessage, ChatContext, extractRelevantArticles, MODELS } from '@/lib/gemini';
import { searchHybrid, fetchArticles, SearchResult } from '@/lib/pinecone';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Extract article numbers explicitly mentioned in the query (fallback when AI extraction fails)
function extractExplicitArticleNumbers(query: string): number[] {
  const numbers = new Set<number>();

  // Pattern 1: "56 straipsnis", "56 straipsnio", etc. (2+ digit numbers only)
  const pattern1 = /(\d{2,3})\s*straipsn/gi;
  let match;
  while ((match = pattern1.exec(query)) !== null) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 264) numbers.add(num);
  }

  // Pattern 2: "DK 56", "DK56" (any number, explicit DK reference)
  const pattern2 = /DK\s*(\d+)/gi;
  while ((match = pattern2.exec(query)) !== null) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 264) numbers.add(num);
  }

  // Pattern 3: "str. 56"
  const pattern3 = /str\.\s*(\d+)/gi;
  while ((match = pattern3.exec(query)) !== null) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 264) numbers.add(num);
  }

  return [...numbers];
}

interface ChatRequestBody {
  message: string;
  history?: ChatMessage[];
  context?: ChatContext;
  useFallbackModel?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { message, history = [], context, useFallbackModel = false } = body;
    const modelToUse = useFallbackModel ? MODELS.fallback : MODELS.primary;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // 1. Extract explicitly mentioned article numbers from query (regex fallback)
    const explicitArticles = extractExplicitArticleNumbers(message);
    console.log('Explicit articles from regex:', explicitArticles);

    // 2. Use Gemini to identify potentially relevant articles
    const aiArticleNumbers = await extractRelevantArticles(message);
    console.log('AI extracted articles:', aiArticleNumbers);

    // 3. Merge: explicit mentions first, then AI suggestions (deduplicated)
    const relevantArticleNumbers = [
      ...explicitArticles,
      ...aiArticleNumbers.filter(n => !explicitArticles.includes(n))
    ].slice(0, 10);
    console.log('Final article numbers:', relevantArticleNumbers);

    // Stream the response with status updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendStatus = (status: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', status })}\n\n`));
        };

        try {
          // Step 1: Generate embedding
          sendStatus('Analizuoju klausimą...');
          const queryEmbedding = await generateEmbedding(message);

          // Step 2: Hybrid search + direct article fetch
          sendStatus('Ieškau aktualių šaltinių...');
          const [hybridResults, directArticles] = await Promise.all([
            searchHybrid(queryEmbedding, 12, 6, 4),
            fetchArticles(relevantArticleNumbers),
          ]);

          // Merge and deduplicate results
          const seenIds = new Set<string>();
          const searchResults: SearchResult[] = [];

          for (const article of directArticles) {
            if (!seenIds.has(article.id)) {
              seenIds.add(article.id);
              searchResults.push(article);
            }
          }
          for (const result of hybridResults) {
            if (!seenIds.has(result.id) && searchResults.length < 14) {
              seenIds.add(result.id);
              searchResults.push(result);
            }
          }

          const legislationCount = searchResults.filter(r => r.metadata.docType === 'legislation').length;
          const rulingCount = searchResults.filter(r => r.metadata.docType === 'ruling').length;
          const nutarimaiCount = searchResults.filter(r => r.metadata.docType === 'nutarimas').length;
          const parts = [`${legislationCount} straipsn.`];
          if (rulingCount > 0) parts.push(`${rulingCount} nutart.`);
          if (nutarimaiCount > 0) parts.push(`${nutarimaiCount} vyriaus. nutar.`);
          sendStatus(`Rasta ${parts.join(', ')}. Ruošiu atsakymą...`);

          // Label each source with its type for the LLM
          const contextTexts = searchResults.map((r) => {
            if (r.metadata.docType === 'legislation') {
              const articleNum = r.metadata.articleNumber;
              const title = r.metadata.articleTitle || '';
              return `[DARBO KODEKSAS, ${articleNum} straipsnis${title ? `: ${title}` : ''}]\n${r.text}`;
            } else if (r.metadata.docType === 'ruling') {
              // Build rich context for LAT rulings with case number and summary
              const caseNum = r.metadata.caseNumber;
              const year = r.metadata.year || '';
              const summary = r.metadata.caseSummary;
              const title = r.metadata.caseTitle;

              let header = '[LAT NUTARTIS';
              if (caseNum) header += `, Nr. ${caseNum}`;
              else if (year) header += `, ${year}`;
              header += ']';

              let content = '';
              if (title) content += `Tema: ${title}\n`;
              if (summary) content += `Santrauka: ${summary}\n\n`;
              content += r.text;

              return `${header}\n${content}`;
            } else if (r.metadata.docType === 'nutarimas') {
              const title = r.metadata.title || r.metadata.docId;
              return `[VYRIAUSYBĖS NUTARIMAS: ${title}]\n${r.text}`;
            }
            return r.text;
          });

          // Send search results metadata
          const metadata = {
            type: 'metadata',
            sources: searchResults.map((r) => ({
              id: r.id, // Full chunk ID for fetching specific chunk
              docId: r.metadata.docId,
              docType: r.metadata.docType,
              sourceFile: r.metadata.sourceFile,
              score: r.score,
              articleNumber: r.metadata.articleNumber,
              articleTitle: r.metadata.articleTitle,
              // Ruling-specific fields
              caseNumber: r.metadata.caseNumber,
              caseTitle: r.metadata.caseTitle,
              caseSummary: r.metadata.caseSummary,
              sourceUrl: (r.metadata as any).sourceUrl,
              sourcePage: (r.metadata as any).sourcePage,
            })),
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`)
          );

          // Stream the response
          for await (const chunk of streamRAGResponse(
            message,
            contextTexts,
            history,
            context,
            modelToUse
          )) {
            const data = { type: 'text', content: chunk };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }

          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorData = {
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
