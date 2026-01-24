'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatSource } from '@/types';

interface ParsedQuestion {
  type: 'choice' | 'open';
  question: string;
  options?: string[];
}

interface CaseNumberMap {
  [caseNumber: string]: { docId: string; sourceUrl?: string; sourcePage?: number };
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

function processContent(text: string, caseNumberMap?: CaseNumberMap): string {
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
}

interface AssistantMessageProps {
  content: string;
  isLastMessage: boolean;
  isLoading: boolean;
  onOptionClick: (option: string) => void;
  onArticleClick: (articleNum: number) => void;
  onCaseClick: (docId: string) => void;
  sources?: ChatSource[];
}

export function AssistantMessage({
  content,
  isLastMessage,
  isLoading,
  onOptionClick,
  onArticleClick,
  onCaseClick,
  sources,
}: AssistantMessageProps) {
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
