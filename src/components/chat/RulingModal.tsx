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
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {loading ? 'Kraunama...' : ruling?.title || 'LAT sprendimas'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                  <h3 className="font-semibold mb-1">{ruling.caseTitle}</h3>
                </div>
              )}

              {/* AI Summary */}
              {ruling.caseSummary && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 mb-4">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Santrauka:</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{ruling.caseSummary}</p>
                </div>
              )}

              {/* Source info */}
              <div className="bg-muted border border-border rounded-lg px-3 py-2 mb-4">
                <p className="text-xs text-muted-foreground">
                  {ruling.docType === 'nutarimas'
                    ? `Vyriausybės nutarimas`
                    : `LAT praktikos apžvalga`}
                  {ruling.sourceFile && ` • ${ruling.sourceFile.replace('rulings/', '').replace('.pdf', '')}`}
                </p>
              </div>

              {/* Full text */}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {ruling.text}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          {ruling?.sourceUrl && (
            <Button
              variant="default"
              onClick={() => {
                const pageAnchor = ruling.sourcePage ? `#page=${ruling.sourcePage}` : '';
                window.open(`${ruling.sourceUrl}${pageAnchor}`, '_blank', 'noopener,noreferrer');
              }}
              className="flex-1"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {ruling.docType === 'nutarimas' ? 'Atidaryti e-tar.lt' : 'Atidaryti PDF'}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className={ruling?.sourceUrl ? '' : 'w-full'}>
            Uždaryti
          </Button>
        </div>
      </div>
    </div>
  );
}
