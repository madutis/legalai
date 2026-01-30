import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding, streamRAGResponse, ChatMessage, ChatContext, extractRelevantArticles, MODELS } from '@/lib/gemini';
import { searchHybrid, fetchArticles, SearchResult } from '@/lib/pinecone';
import { getCaseById, getPdfById } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyIdToken, checkUsageLimitAdmin, incrementUsageAdmin, startTrialAdmin } from '@/lib/firebase/admin';

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
  // Rate limit: 10 requests per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';
  const { success, remaining, resetIn } = checkRateLimit(ip, 10, 60 * 1000);

  if (!success) {
    return NextResponse.json(
      { error: 'Per daug užklausų. Bandykite po ' + resetIn + ' sek.' },
      {
        status: 429,
        headers: {
          'Retry-After': resetIn.toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // Check authentication and usage limits for authenticated users
  const authHeader = request.headers.get('authorization');
  const user = await verifyIdToken(authHeader);
  let usageInfo: { remaining: number; showWarning: boolean } | null = null;

  if (user) {
    const usageCheck = await checkUsageLimitAdmin(user.uid, user.email || undefined);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason || 'limit_reached', remaining: 0 },
        { status: 429 }
      );
    }
    usageInfo = { remaining: usageCheck.remaining, showWarning: usageCheck.showWarning };

    // Start trial on first message (idempotent - only sets if not already set)
    startTrialAdmin(user.uid, user.email).catch((err) => {
      console.error('Failed to start trial:', err);
    });
  }

  try {
    const body: ChatRequestBody = await request.json();
    const { message, history = [], context, useFallbackModel = false } = body;
    const modelToUse = useFallbackModel ? MODELS.fallback : MODELS.primary;

    if (!message || typeof message !== 'string' || message.length > 5000) {
      return NextResponse.json(
        { error: message?.length > 5000 ? 'Message too long (max 5000 characters)' : 'Message is required' },
        { status: 400 }
      );
    }

    // 1. Extract explicitly mentioned article numbers from query (regex - sync, fast)
    const explicitArticles = extractExplicitArticleNumbers(message);

    // Stream the response with status updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendStatus = (status: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', status })}\n\n`));
        };

        try {
          // Increment usage count at start of processing (fire and forget)
          if (user) {
            incrementUsageAdmin(user.uid).catch(err => {
              console.error('Failed to increment usage:', err);
            });
          }

          // Send usage info early in the stream
          if (usageInfo) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'usage',
              remaining: usageInfo.remaining - 1, // Account for this message
              showWarning: usageInfo.showWarning || usageInfo.remaining <= 5,
            })}\n\n`));
          }

          // Step 1: Generate embedding + AI article extraction in parallel
          sendStatus('Analizuoju klausimą...');
          const [queryEmbedding, aiArticleNumbers] = await Promise.all([
            generateEmbedding(message),
            extractRelevantArticles(message),
          ]);

          // Merge: explicit mentions first, then AI suggestions (deduplicated)
          const relevantArticleNumbers = [
            ...explicitArticles,
            ...aiArticleNumbers.filter((n: number) => !explicitArticles.includes(n))
          ].slice(0, 10);

          // Step 2: Hybrid search + direct article fetch
          sendStatus('Ieškau aktualių šaltinių...');
          const [hybridResults, directArticles] = await Promise.all([
            searchHybrid(queryEmbedding, 12, 8, 4, 6, 6), // legislation, LAT rulings, nutarimai, VDI FAQ, VDI docs
            fetchArticles(relevantArticleNumbers),
          ]);

          // Merge and deduplicate results (no artificial cap - let quality filters work)
          const seenIds = new Set<string>();
          const searchResults: SearchResult[] = [];

          for (const article of directArticles) {
            if (!seenIds.has(article.id)) {
              seenIds.add(article.id);
              searchResults.push(article);
            }
          }
          for (const result of hybridResults) {
            if (!seenIds.has(result.id)) {
              seenIds.add(result.id);
              searchResults.push(result);
            }
          }

          // Build informative status with document type breakdown
          const typeCounts = searchResults.reduce((acc, r) => {
            const type = r.metadata.docType;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const typeLabels: Record<string, string> = {
            legislation: 'straipsn.',
            lat_ruling: 'LAT nutart.',
            nutarimas: 'nutarim.',
            vdi_faq: 'VDI DUK',
            vdi_doc: 'VDI dok.',
          };

          const breakdown = Object.entries(typeCounts)
            .map(([type, count]) => `${count} ${typeLabels[type] || type}`)
            .join(', ');

          sendStatus(`Rasta: ${breakdown}. Ruošiu atsakymą...`);

          // Pre-fetch all LAT cases to avoid N+1 queries
          const latRulingIds = searchResults
            .filter(r => r.metadata.docType === 'lat_ruling')
            .map(r => r.metadata.docId);
          const latCasesMap = new Map(
            latRulingIds.map(id => [id, getCaseById(id)])
          );
          const latPdfsMap = new Map(
            [...latCasesMap.values()]
              .filter(c => c?.pdf_id)
              .map(c => [c!.pdf_id, getPdfById(c!.pdf_id)])
          );

          // Label each source with its type for the LLM
          const contextTexts = searchResults.map((r) => {
            if (r.metadata.docType === 'legislation') {
              const articleNum = r.metadata.articleNumber;
              const title = r.metadata.articleTitle || '';
              const lawLabel = r.metadata.lawCode === 'DSS' ? 'DSS ĮSTATYMAS' :
                             r.metadata.lawCode === 'PSS' ? 'PRIEŠGAISRINĖS SAUGOS ĮSTATYMAS' :
                             'DARBO KODEKSAS';
              return `[${lawLabel}, ${articleNum} straipsnis${title ? `: ${title}` : ''}]\n${r.text}`;
            } else if (r.metadata.docType === 'lat_ruling') {
              // Use pre-fetched LAT case
              const latCase = latCasesMap.get(r.metadata.docId);
              const caseNum = latCase?.case_number || r.metadata.caseNumber;
              const year = r.metadata.pdfId?.split('-')[0] || '';

              let header = '[LAT NUTARTIS';
              if (caseNum) header += `, Nr. ${caseNum}`;
              else if (year) header += `, ${year}`;
              header += ']';

              let content = '';
              if (latCase?.title) content += `Tema: ${latCase.title}\n`;
              if (latCase?.summary) content += `Santrauka: ${latCase.summary}\n\n`;
              content += latCase?.full_text || r.text;

              return `${header}\n${content}`;
            } else if (r.metadata.docType === 'nutarimas') {
              const title = r.metadata.title || r.metadata.docId;
              return `[VYRIAUSYBĖS NUTARIMAS: ${title}]\n${r.text}`;
            } else if (r.metadata.docType === 'vdi_faq') {
              const question = r.metadata.question || '';
              const category = r.metadata.category ? ` (${r.metadata.category})` : '';
              return `[VDI DUK${category}]\nKlausimas: ${question}\nAtsakymas: ${r.text}`;
            } else if (r.metadata.docType === 'vdi_doc') {
              const title = r.metadata.title || 'VDI dokumentas';
              const topics = r.metadata.topics ? ` (${r.metadata.topics})` : '';
              return `[VDI DOKUMENTAS: ${title}${topics}]\n${r.text}`;
            }
            return r.text;
          });

          // Send search results metadata (enrich LAT rulings with PDF URL from SQLite)
          const metadata = {
            type: 'metadata',
            sources: searchResults.map((r) => {
              let sourceUrl = r.metadata.sourceUrl;
              let sourcePage = r.metadata.sourcePage;
              let caseNumber = r.metadata.caseNumber;

              // For new LAT rulings, use pre-fetched data
              if (r.metadata.docType === 'lat_ruling') {
                const latCase = latCasesMap.get(r.metadata.docId);
                if (latCase) {
                  const pdf = latPdfsMap.get(latCase.pdf_id);
                  sourceUrl = pdf?.url || sourceUrl;
                  sourcePage = latCase.page_start || sourcePage;
                  caseNumber = latCase.case_number || caseNumber;
                }
              }

              return {
                id: r.id,
                docId: r.metadata.docId,
                docType: r.metadata.docType,
                sourceFile: r.metadata.sourceFile,
                score: r.score,
                articleNumber: r.metadata.articleNumber,
                articleTitle: r.metadata.articleTitle,
                lawCode: r.metadata.lawCode,
                caseNumber,
                caseTitle: r.metadata.caseTitle,
                caseSummary: r.metadata.caseSummary,
                sourceUrl,
                sourcePage,
                // VDI FAQ fields
                question: r.metadata.question,
                category: r.metadata.category,
                // VDI Doc fields
                title: r.metadata.title,
                tier: r.metadata.tier,
                topics: r.metadata.topics,
              };
            }),
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
        'X-RateLimit-Remaining': remaining.toString(),
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
