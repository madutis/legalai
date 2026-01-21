'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RulingModal } from './RulingModal';
import { ArticleModal } from './ArticleModal';
import { exportToPDF } from '@/lib/pdf-export';
import ReactMarkdown from 'react-markdown';

// Parse structured questions from assistant response
interface ParsedQuestion {
  type: 'choice' | 'open';
  question: string;
  options?: string[];
}

function parseQuestions(text: string): { content: string; question: ParsedQuestion | null } {
  const choiceMatch = text.match(/\[KLAUSIMAS\]\s*([\s\S]*?)\[\/KLAUSIMAS\]/);
  if (choiceMatch) {
    const inner = choiceMatch[1];
    const lines = inner.trim().split('\n');
    const questionText = lines[0];
    const options = inner.match(/\[PASIRINKIMAS\]([^\[]+)/g)?.map(o => o.replace('[PASIRINKIMAS]', '').trim()) || [];

    const contentWithoutQuestion = text.replace(choiceMatch[0], '').trim();
    return {
      content: contentWithoutQuestion,
      question: { type: 'choice', question: questionText, options },
    };
  }

  const openMatch = text.match(/\[ATVIRAS_KLAUSIMAS\]\s*([\s\S]*?)\[\/ATVIRAS_KLAUSIMAS\]/);
  if (openMatch) {
    const questionText = openMatch[1].trim();
    const contentWithoutQuestion = text.replace(openMatch[0], '').trim();
    return {
      content: contentWithoutQuestion,
      question: { type: 'open', question: questionText },
    };
  }

  return { content: text, question: null };
}

interface CaseNumberMap {
  [caseNumber: string]: { docId: string; sourceUrl?: string; sourcePage?: number };
}

function AssistantMessage({
  content,
  isLastMessage,
  isLoading,
  onOptionClick,
  onArticleClick,
  onCaseClick,
  sources,
}: {
  content: string;
  isLastMessage: boolean;
  isLoading: boolean;
  onOptionClick: (option: string) => void;
  onArticleClick: (articleNum: number) => void;
  onCaseClick: (docId: string) => void;
  sources?: Source[];
}) {
  const caseNumberMap = useMemo(() => {
    const map: CaseNumberMap = {};
    if (sources) {
      for (const s of sources) {
        if (s.caseNumber) {
          map[s.caseNumber] = {
            docId: s.id,
            sourceUrl: s.sourceUrl,
            sourcePage: s.sourcePage,
          };
        }
      }
    }
    return map;
  }, [sources]);

  const { content: textContent, question } = useMemo(() => parseQuestions(content), [content]);
  const processedContent = useMemo(() => processContent(textContent, caseNumberMap), [textContent, caseNumberMap]);

  return (
    <div className="prose prose-sm max-w-none text-card-foreground">
      {processedContent && (
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            h1: ({ children }) => <h3 className="font-serif font-semibold text-base mb-2 mt-4 text-foreground">{children}</h3>,
            h2: ({ children }) => <h4 className="font-serif font-semibold text-base mb-2 mt-3 text-foreground">{children}</h4>,
            h3: ({ children }) => <h5 className="font-semibold mb-2 mt-2 text-foreground">{children}</h5>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-gold/50 pl-4 italic text-muted-foreground my-3 bg-gold/5 py-2 pr-2 rounded-r">
                {children}
              </blockquote>
            ),
            a: ({ href, children }) => {
              const articleMatch = href?.match(/e-tar\.lt.*#part_(\d+)/);
              if (articleMatch) {
                const articleNum = parseInt(articleMatch[1]);
                return (
                  <button
                    onClick={() => onArticleClick(articleNum)}
                    className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 cursor-pointer transition-colors"
                  >
                    {children}
                  </button>
                );
              }

              const childText = typeof children === 'string' ? children :
                Array.isArray(children) ? children.join('') : '';
              const caseNumFromText = childText.match(/([eE]?3K-\d+-\d+-\d+-?\/\d{4})/)?.[1];
              const caseNumFromHref = href?.match(/^lat:\/\/(.+)$/)?.[1];
              const caseNum = caseNumFromHref || caseNumFromText;

              if (caseNum) {
                const caseInfo = caseNumberMap[caseNum];
                if (caseInfo) {
                  return (
                    <button
                      onClick={() => onCaseClick(caseInfo.docId)}
                      className="text-gold hover:text-gold/80 underline decoration-gold/30 hover:decoration-gold/60 cursor-pointer font-medium transition-colors"
                      title="Atidaryti LAT nutartį"
                    >
                      {children}
                    </button>
                  );
                }
                return (
                  <span className="text-gold font-medium" title="LAT nutartis">
                    {children}
                  </span>
                );
              }

              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors"
                >
                  {children}
                </a>
              );
            },
          }}
        >
          {processedContent}
        </ReactMarkdown>
      )}

      {question && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="font-medium text-foreground mb-3">{question.question}</p>
          {isLastMessage && !isLoading ? (
            <>
              {question.type === 'choice' && question.options && (
                <div className="flex flex-wrap gap-2">
                  {question.options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => onOptionClick(option)}
                      className="px-4 py-2 bg-muted hover:bg-accent rounded-lg text-sm font-medium text-foreground transition-all duration-200 border border-border hover:border-gold/50 hover:shadow-sm"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              {question.type === 'open' && (
                <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Įveskite atsakymą žemiau
                </p>
              )}
            </>
          ) : (
            question.type === 'choice' && question.options && (
              <div className="flex flex-wrap gap-2">
                {question.options.map((option, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-muted/50 rounded-lg text-sm text-muted-foreground border border-border/50"
                  >
                    {option}
                  </span>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

const processContent = (text: string, caseNumberMap?: CaseNumberMap): string => {
  const eTarBase = 'https://www.e-tar.lt/portal/lt/legalAct/f6d686707e7011e6b969d7ae07280e89/asr#part_';

  let processed = text
    .replace(/\s*\[\d+\]/g, '')
    .replace(
      /(\d{1,3})(?:-(?:ojo|asis|ojo|ojo))?\s*(?:straipsn\w*|str\.)/gi,
      (match, num) => `[${match}](${eTarBase}${num})`
    );

  if (caseNumberMap && Object.keys(caseNumberMap).length > 0) {
    const casePattern = /(?:Nr\.\s*)?([eE]?[0-9A-Z]+-\d+-\d+-\d+-?\/\d{4})/g;
    processed = processed.replace(casePattern, (match, caseNum) => {
      if (caseNumberMap[caseNum]) {
        return `[${match}](lat://${caseNum})`;
      }
      return match;
    });
  }

  return processed;
};

interface ChatInterfaceProps {
  topic?: string;
  userRole?: string;
  companySize?: string;
}

interface Source {
  id: string;
  docId: string;
  docType: string;
  sourceFile: string;
  score: number;
  articleNumber?: number;
  articleTitle?: string;
  title?: string;
  sourceUrl?: string;
  sourcePage?: number;
  caseNumber?: string;
  caseTitle?: string;
  caseSummary?: string;
  // VDI FAQ fields
  question?: string;
  category?: string;
  // Legislation-specific fields
  lawCode?: string; // e.g., 'DK' for Darbo Kodeksas, 'DSS' for DSS Istatymas
}

export function ChatInterface({ topic, userRole, companySize }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [selectedRulingDocId, setSelectedRulingDocId] = useState<string | null>(null);
  const [selectedArticleNumber, setSelectedArticleNumber] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isLoading,
    status,
    error,
    canRetry,
    sendMessage,
    stopGeneration,
    retry,
    isConsultationFinished,
    isConsultationComplete,
    remainingFollowUps,
  } = useChat({ topic, userRole, companySize });

  const handleExportPDF = () => {
    exportToPDF({
      messages,
      context: { topic, userRole, companySize },
      exportedAt: new Date(),
    });
  };

  const isNearBottomRef = useRef(true);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const threshold = 100;
    isNearBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
      isNearBottomRef.current = true;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatSource = (source: Source): string | null => {
    if (source.docType === 'legislation' && source.articleNumber) {
      const lawLabel = source.lawCode === 'DSS' ? 'DSS' : 'DK';
      return `${lawLabel} ${source.articleNumber} str.`;
    }
    if (source.docType === 'lat_ruling') {
      if (source.caseNumber) {
        return `LAT ${source.caseNumber}`;
      }
      const yearMatch = source.sourceFile?.match(/(\d{4})/) || source.docId?.match(/^(\d{4})-/);
      if (yearMatch) {
        return `LAT ${yearMatch[1]}`;
      }
      return 'LAT nutartis';
    }
    if (source.docType === 'nutarimas') {
      const match = source.docId.match(/nutarimas-(\d+)-(\d+)/);
      if (match) {
        return `Nut. ${match[1]}`;
      }
      return 'Nutarimas';
    }
    if (source.docType === 'vdi_faq') {
      return 'VDI DUK';
    }
    if (source.docType === 'vdi_doc') {
      return source.title ? `VDI: ${source.title.slice(0, 30)}${source.title.length > 30 ? '...' : ''}` : 'VDI Dokumentas';
    }
    return null;
  };

  const getSourceUrl = (source: Source): string | null => {
    if (source.docType === 'legislation' && source.articleNumber) {
      // DSS Istatymas uses different e-TAR document ID
      const eTarDocId = source.lawCode === 'DSS' ? 'TAR.95C79D036AA4' : 'f6d686707e7011e6b969d7ae07280e89';
      return `https://www.e-tar.lt/portal/lt/legalAct/${eTarDocId}/asr#part_${source.articleNumber}`;
    }
    if ((source.docType === 'lat_ruling') && source.sourceUrl) {
      const pageAnchor = source.sourcePage ? `#page=${source.sourcePage}` : '';
      return `${source.sourceUrl}${pageAnchor}`;
    }
    if (source.docType === 'vdi_faq') {
      return 'https://vdi.lrv.lt/lt/dazniausiai-uzduodami-klausimai/';
    }
    if (source.docType === 'vdi_doc' && source.sourceUrl) {
      return source.sourceUrl;
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl mx-auto w-full"
      >
        {messages.length === 0 && (
          <div className="text-center py-16 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="font-serif text-xl font-semibold text-foreground mb-2">Sveiki atvykę</h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              Užduokite klausimą apie Lietuvos darbo teisę ir aš pasistengsiu padėti,
              remdamasis Darbo kodeksu ir teismų praktika.
            </p>
          </div>
        )}

        <div className="space-y-5">
          {messages.map((message, idx) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card border border-border shadow-sm'
                }`}
              >
                {message.role === 'assistant' && message.content === '' && isLoading ? (
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-sm text-muted-foreground">{status || 'Ruošiuosi...'}</span>
                  </div>
                ) : (
                  <>
                    {message.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    ) : (
                      <AssistantMessage
                        content={message.content}
                        isLastMessage={message.id === messages[messages.length - 1]?.id}
                        isLoading={isLoading}
                        onOptionClick={(option) => {
                          setInput('');
                          sendMessage(option);
                        }}
                        onArticleClick={setSelectedArticleNumber}
                        onCaseClick={setSelectedRulingDocId}
                        sources={(() => {
                          const isFinalAnswer = !message.content.includes('[KLAUSIMAS]') &&
                            !message.content.includes('[ATVIRAS_KLAUSIMAS]');
                          if (isFinalAnswer) {
                            return messages
                              .filter(m => m.role === 'assistant')
                              .flatMap(m => m.sources || []) as Source[];
                          }
                          return (message.sources || []) as Source[];
                        })()}
                      />
                    )}

                    {/* Sources */}
                    {(() => {
                      if (message.role !== 'assistant' || !message.sources?.length) return null;

                      const citedIndices = new Set(
                        [...message.content.matchAll(/\[(\d+)\]/g)]
                          .map(m => parseInt(m[1]) - 1)
                      );

                      const citedSources = citedIndices.size > 0
                        ? message.sources.filter((_, i) => citedIndices.has(i))
                        : [];

                      const seen = new Set<string>();
                      const uniqueSources = citedSources.filter(s => {
                        const key = (s as Source).id || `${s.docId}-${(s as Source).articleNumber || ''}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                      });

                      if (uniqueSources.length === 0) return null;

                      return (
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Šaltiniai
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {uniqueSources
                              .map((source) => ({
                                source: source as Source,
                                label: formatSource(source as Source),
                                url: getSourceUrl(source as Source),
                              }))
                              .filter((s) => s.label !== null)
                              .slice(0, 10)
                              .map((s, i) => {
                                const isExternalLink = ((s.source.docType === 'lat_ruling') && s.source.sourceUrl) || s.source.docType === 'vdi_faq' || (s.source.docType === 'vdi_doc' && s.source.sourceUrl);

                                return (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      if (s.source.docType === 'vdi_faq') {
                                        window.open('https://vdi.lrv.lt/lt/dazniausiai-uzduodami-klausimai/', '_blank');
                                      } else if (s.source.docType === 'vdi_doc' && s.source.sourceUrl) {
                                        window.open(s.source.sourceUrl, '_blank');
                                      } else if (s.source.docType === 'lat_ruling' || s.source.docType === 'nutarimas') {
                                        setSelectedRulingDocId(s.source.id);
                                      } else if (s.source.articleNumber) {
                                        setSelectedArticleNumber(s.source.articleNumber);
                                      }
                                    }}
                                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted/80 text-muted-foreground hover:bg-gold/10 hover:text-gold transition-colors cursor-pointer border border-transparent hover:border-gold/30"
                                    title={s.source.caseTitle || s.source.caseSummary || undefined}
                                  >
                                    {s.label}
                                    {isExternalLink ? (
                                      <svg className="w-3 h-3 ml-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    ) : (
                                      <svg className="w-3 h-3 ml-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    )}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-3 bg-destructive/10 text-destructive text-sm rounded-xl flex items-center justify-between border border-destructive/20">
          <span>{error}</span>
          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              className="ml-3 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg"
            >
              Bandyti dar kartą
            </Button>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border/50 bg-background px-3 sm:px-4 py-3 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {isConsultationComplete ? (
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gold/5 border border-gold/20 rounded-2xl p-5 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-foreground font-medium mb-1">Konsultacija baigta</p>
              <p className="text-muted-foreground text-sm mb-4">Ačiū, kad naudojotės mūsų paslauga!</p>
              <Button
                onClick={handleExportPDF}
                variant="outline"
                className="rounded-xl border-gold/30 text-gold hover:bg-gold/10"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Eksportuoti PDF
              </Button>
            </div>
          </div>
        ) : (
          <>
            {isConsultationFinished && remainingFollowUps > 0 && (
              <div className="max-w-4xl mx-auto mb-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Galite užduoti dar {remainingFollowUps} {remainingFollowUps === 1 ? 'papildomą klausimą' : 'papildomus klausimus'}
                </p>
                <Button
                  onClick={handleExportPDF}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-gold"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </Button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3 max-w-4xl mx-auto">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isConsultationFinished ? "Papildomas klausimas..." : "Įveskite klausimą..."}
                className="flex-1 min-h-[44px] max-h-32 resize-none rounded-xl text-base border-border focus:border-gold focus:ring-gold/20"
                disabled={isLoading}
              />
              {isLoading ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={stopGeneration}
                  className="rounded-xl px-4 border-border hover:bg-muted"
                >
                  <svg className="w-4 h-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline">Stop</span>
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!input.trim()}
                  className="rounded-xl px-5 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                >
                  <span className="hidden sm:inline mr-1.5">Siųsti</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Button>
              )}
            </form>
          </>
        )}
        <p className="text-xs text-muted-foreground/60 mt-3 text-center">
          Tai nėra teisinė konsultacija. Sudėtingais atvejais kreipkitės į teisininką.
        </p>
      </div>

      {/* Modals */}
      {selectedRulingDocId && (
        <RulingModal
          docId={selectedRulingDocId}
          onClose={() => setSelectedRulingDocId(null)}
        />
      )}

      {selectedArticleNumber && (
        <ArticleModal
          articleNumber={selectedArticleNumber}
          onClose={() => setSelectedArticleNumber(null)}
        />
      )}
    </div>
  );
}
