'use client';

import type { ChatSource } from '@/types';
import { formatSource, getSourceUrl } from './source-utils';

interface SourcesListProps {
  sources: ChatSource[];
  content: string;
  onRulingClick: (docId: string) => void;
  onArticleClick: (articleNum: number) => void;
}

export function SourcesList({ sources, content, onRulingClick, onArticleClick }: SourcesListProps) {
  if (!sources.length) return null;

  // Find which sources are actually cited in the content
  const citedIndices = new Set(
    [...content.matchAll(/\[(\d+)[,\]]/g)]
      .map(m => parseInt(m[1]) - 1)
  );

  const citedSources = citedIndices.size > 0
    ? sources.filter((_, i) => citedIndices.has(i))
    : [];

  // Deduplicate
  const seen = new Set<string>();
  const uniqueSources = citedSources.filter((s) => {
    const key = s.id || `${s.docId}-${s.articleNumber || ''}`;
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
            source,
            label: formatSource(source),
            url: getSourceUrl(source),
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
                    onRulingClick(s.source.id);
                  } else if (s.source.articleNumber) {
                    onArticleClick(s.source.articleNumber);
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
}
