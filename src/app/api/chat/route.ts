import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding, streamRAGResponse, ChatMessage, ChatContext, extractRelevantArticles, MODELS } from '@/lib/gemini';
import { searchSimilar, fetchArticles, SearchResult } from '@/lib/pinecone';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

    // 1. Use Gemini to identify potentially relevant articles
    const relevantArticleNumbers = await extractRelevantArticles(message);

    // 2. Generate embedding for semantic search
    const queryEmbedding = await generateEmbedding(message);

    // 3. Parallel: semantic search + direct article fetch
    const [semanticResults, directArticles] = await Promise.all([
      searchSimilar(queryEmbedding, 10),
      fetchArticles(relevantArticleNumbers),
    ]);

    // 4. Merge and deduplicate results (direct articles first, then semantic)
    const seenIds = new Set<string>();
    const searchResults: SearchResult[] = [];

    for (const article of directArticles) {
      if (!seenIds.has(article.id)) {
        seenIds.add(article.id);
        searchResults.push(article);
      }
    }
    for (const result of semanticResults) {
      if (!seenIds.has(result.id) && searchResults.length < 12) {
        seenIds.add(result.id);
        searchResults.push(result);
      }
    }

    // 3. Extract context from search results
    const contextTexts = searchResults.map((r) => r.text);

    // 4. Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send search results metadata first
          const metadata = {
            type: 'metadata',
            sources: searchResults.map((r) => ({
              docId: r.metadata.docId,
              docType: r.metadata.docType,
              sourceFile: r.metadata.sourceFile,
              score: r.score,
              articleNumber: r.metadata.articleNumber,
              articleTitle: r.metadata.articleTitle,
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
