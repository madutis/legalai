'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { RulingModal } from './RulingModal';
import { ArticleModal } from './ArticleModal';
import ReactMarkdown from 'react-markdown';

// Parse structured questions from assistant response
interface ParsedQuestion {
  type: 'choice' | 'open';
  question: string;
  options?: string[];
}

function parseQuestions(text: string): { content: string; question: ParsedQuestion | null } {
  // Check for choice question
  const choiceMatch = text.match(/\[KLAUSIMAS\]\s*([\s\S]*?)\[\/KLAUSIMAS\]/);
  if (choiceMatch) {
    const inner = choiceMatch[1];
    const lines = inner.trim().split('\n');
    const questionText = lines[0];
    const options = inner.match(/\[PASIRINKIMAS\]([^\[]+)/g)?.map(o => o.replace('[PASIRINKIMAS]', '').trim()) || [];

    const contentWithoutQuestion = text.replace(choiceMatch[0], '').trim();
    return {
      content: contentWithoutQuestion,
      question: {
        type: 'choice',
        question: questionText,
        options,
      },
    };
  }

  // Check for open question
  const openMatch = text.match(/\[ATVIRAS_KLAUSIMAS\]\s*([\s\S]*?)\[\/ATVIRAS_KLAUSIMAS\]/);
  if (openMatch) {
    const questionText = openMatch[1].trim();
    const contentWithoutQuestion = text.replace(openMatch[0], '').trim();
    return {
      content: contentWithoutQuestion,
      question: {
        type: 'open',
        question: questionText,
      },
    };
  }

  return { content: text, question: null };
}

// Component for rendering assistant messages with interactive questions
function AssistantMessage({
  content,
  isLastMessage,
  isLoading,
  onOptionClick,
  onArticleClick,
}: {
  content: string;
  isLastMessage: boolean;
  isLoading: boolean;
  onOptionClick: (option: string) => void;
  onArticleClick: (articleNum: number) => void;
}) {
  const { content: textContent, question } = useMemo(() => parseQuestions(content), [content]);
  const processedContent = useMemo(() => processContent(textContent), [textContent]);

  return (
    <div className="prose prose-sm prose-slate max-w-none">
      {/* Main content */}
      {processedContent && (
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-3 ml-4 list-disc">{children}</ul>,
            ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            h1: ({ children }) => <h3 className="font-semibold text-base mb-2 mt-4">{children}</h3>,
            h2: ({ children }) => <h4 className="font-semibold text-base mb-2 mt-3">{children}</h4>,
            h3: ({ children }) => <h5 className="font-semibold mb-2 mt-2">{children}</h5>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-slate-300 pl-3 italic text-slate-600">
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
                    className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    {children}
                  </button>
                );
              }
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
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

      {/* Interactive question - only show on last message when not loading */}
      {question && isLastMessage && !isLoading && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="font-medium text-slate-800 mb-3">{question.question}</p>
          {question.type === 'choice' && question.options && (
            <div className="flex flex-wrap gap-2">
              {question.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => onOptionClick(option)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors border border-slate-200 hover:border-slate-300"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          {question.type === 'open' && (
            <p className="text-xs text-slate-500 italic">Įveskite atsakymą žemiau</p>
          )}
        </div>
      )}
    </div>
  );
}

// Process assistant text: remove citation anchors and linkify articles
const processContent = (text: string): string => {
  const eTarBase = 'https://www.e-tar.lt/portal/lt/legalAct/f6d686707e7011e6b969d7ae07280e89/asr#part_';
  return text
    // Remove citation anchors like [1], [2], etc.
    .replace(/\s*\[\d+\]/g, '')
    // Convert article references to links
    .replace(
      /(\d{1,3})(?:-(?:ojo|asis|ojo|ojo))?\s*(?:straipsn\w*|str\.)/gi,
      (match, num) => `[${match}](${eTarBase}${num})`
    );
};

interface ChatInterfaceProps {
  topic?: string;
  userRole?: string;
  companySize?: string;
}

interface Source {
  docId: string;
  docType: string;
  sourceFile: string;
  score: number;
  articleNumber?: number;
  articleTitle?: string;
}

export function ChatInterface({ topic, userRole, companySize }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [selectedRulingDocId, setSelectedRulingDocId] = useState<string | null>(null);
  const [selectedArticleNumber, setSelectedArticleNumber] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isLoading, error, sendMessage, stopGeneration } = useChat({
    topic,
    userRole,
    companySize,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input after response is complete
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
      return `${source.articleNumber} str.`;
    }
    if (source.docType === 'ruling') {
      const yearMatch = source.sourceFile.match(/(\d{4})/);
      const monthMatch = source.sourceFile.match(/LAT_\d{4}_([^.]+)/);
      if (yearMatch) {
        return `LAT ${yearMatch[1]}${monthMatch ? ` ${monthMatch[1]}` : ''}`;
      }
    }
    return null; // Don't show unidentifiable sources
  };

  const getSourceUrl = (source: Source) => {
    if (source.docType === 'legislation' && source.articleNumber) {
      return `https://www.e-tar.lt/portal/lt/legalAct/f6d686707e7011e6b969d7ae07280e89/asr#part_${source.articleNumber}`;
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      {/* Messages container with proper scrolling */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-12">
            <p className="text-lg mb-2">Sveiki! 👋</p>
            <p className="text-sm max-w-md mx-auto">
              Užduokite klausimą apie Lietuvos darbo teisę ir aš pasistengsiu padėti,
              remdamasis Darbo kodeksu ir teismų praktika.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-900 shadow-sm'
                }`}
              >
                {message.role === 'assistant' && message.content === '' && isLoading ? (
                  <div className="space-y-2 py-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ) : (
                  <>
                    {message.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                      />
                    )}

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-400 mb-2">Šaltiniai:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {message.sources
                            .map((source) => ({
                              source: source as Source,
                              label: formatSource(source as Source),
                              url: getSourceUrl(source as Source),
                            }))
                            .filter((s) => s.label !== null)
                            .slice(0, 5)
                            .map((s, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  if (s.source.docType === 'ruling') {
                                    setSelectedRulingDocId(s.source.docId);
                                  } else if (s.source.articleNumber) {
                                    setSelectedArticleNumber(s.source.articleNumber);
                                  }
                                }}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                              >
                                {s.label}
                                <svg className="w-3 h-3 ml-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
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
        <div className="mx-4 mb-2 px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Įveskite savo klausimą apie darbo teisę..."
            className="flex-1 min-h-[44px] max-h-32 resize-none rounded-xl"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button
              type="button"
              variant="outline"
              onClick={stopGeneration}
              className="rounded-xl"
            >
              Stop
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim()}
              className="rounded-xl px-6"
            >
              Siųsti
            </Button>
          )}
        </form>
        <p className="text-xs text-slate-400 mt-3 text-center">
          Tai nėra teisinė konsultacija. Sudėtingais atvejais kreipkitės į teisininką.
        </p>
      </div>

      {/* Ruling Modal */}
      {selectedRulingDocId && (
        <RulingModal
          docId={selectedRulingDocId}
          onClose={() => setSelectedRulingDocId(null)}
        />
      )}

      {/* Article Modal */}
      {selectedArticleNumber && (
        <ArticleModal
          articleNumber={selectedArticleNumber}
          onClose={() => setSelectedArticleNumber(null)}
        />
      )}
    </div>
  );
}
