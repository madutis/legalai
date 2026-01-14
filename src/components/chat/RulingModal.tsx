'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface RulingModalProps {
  docId: string;
  onClose: () => void;
}

interface RulingData {
  docId: string;
  docType: string;
  title: string;
  caseTitle?: string;
  caseSummary?: string;
  sourceFile: string;
  sourceUrl?: string;
  sourcePage?: number;
  text: string;
}

export function RulingModal({ docId, onClose }: RulingModalProps) {
  const [ruling, setRuling] = useState<RulingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRuling() {
      try {
        const response = await fetch(`/api/ruling/${encodeURIComponent(docId)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch ruling');
        }
        const data = await response.json();
        setRuling(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchRuling();
  }, [docId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-border animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="M2 6h20" />
                <path d="M4 6l2 8h-4l2-8" />
                <path d="M20 6l2 8h-4l2-8" />
                <path d="M2 14a2 2 0 1 0 4 0" />
                <path d="M18 14a2 2 0 1 0 4 0" />
                <circle cx="12" cy="5" r="1.5" />
              </svg>
            </div>
            <h2 className="font-serif text-lg font-semibold">
              {loading ? 'Kraunama...' : ruling?.title || 'LAT sprendimas'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-sm text-muted-foreground">Kraunamas dokumentas...</span>
            </div>
          )}

          {error && (
            <div className="text-destructive py-8 text-center">
              <p>{error}</p>
            </div>
          )}

          {ruling && (
            <div className="prose prose-sm max-w-none">
              {/* Case title */}
              {ruling.caseTitle && (
                <div className="mb-4">
                  <h3 className="font-serif font-semibold mb-1 text-foreground">{ruling.caseTitle}</h3>
                </div>
              )}

              {/* AI Summary */}
              {ruling.caseSummary && (
                <div className="bg-gold/5 border border-gold/20 rounded-xl px-4 py-3 mb-4">
                  <p className="text-xs text-gold font-medium mb-1.5 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Santrauka
                  </p>
                  <p className="text-sm text-foreground/80">{ruling.caseSummary}</p>
                </div>
              )}

              {/* Source info */}
              <div className="bg-muted/50 border border-border rounded-xl px-4 py-3 mb-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {ruling.docType === 'nutarimas'
                    ? `Vyriausybės nutarimas`
                    : `LAT praktikos apžvalga`}
                  {ruling.sourceFile && ` • ${ruling.sourceFile.replace('rulings/', '').replace('.pdf', '')}`}
                </p>
              </div>

              {/* Full text */}
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {ruling.text}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
          {ruling?.sourceUrl && (
            <Button
              variant="default"
              onClick={() => {
                const pageAnchor = ruling.sourcePage ? `#page=${ruling.sourcePage}` : '';
                window.open(`${ruling.sourceUrl}${pageAnchor}`, '_blank', 'noopener,noreferrer');
              }}
              className="flex-1 rounded-xl bg-gold hover:bg-gold/90 text-gold-foreground"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {ruling.docType === 'nutarimas' ? 'Atidaryti e-tar.lt' : 'Atidaryti PDF'}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className={`rounded-xl ${ruling?.sourceUrl ? '' : 'w-full'}`}>
            Uždaryti
          </Button>
        </div>
      </div>
    </div>
  );
}
