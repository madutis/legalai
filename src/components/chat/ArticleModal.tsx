'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ArticleModalProps {
  articleNumber: number;
  onClose: () => void;
}

interface ArticleData {
  articleNumber: number;
  title: string;
  text: string;
  eTarUrl: string;
}

export function ArticleModal({ articleNumber, onClose }: ArticleModalProps) {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const response = await fetch(`/api/article/${articleNumber}`);
        if (!response.ok) {
          throw new Error('Failed to fetch article');
        }
        const data = await response.json();
        setArticle(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [articleNumber]);

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
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {loading ? 'Kraunama...' : `${articleNumber} straipsnis`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          )}

          {error && (
            <div className="text-red-600 py-8 text-center">
              <p>{error}</p>
            </div>
          )}

          {article && (
            <div className="prose prose-sm prose-slate max-w-none">
              {article.title && (
                <h3 className="text-base font-semibold mb-4">{article.title}</h3>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {article.text}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Uždaryti
          </Button>
          {article?.eTarUrl && (
            <a
              href={article.eTarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full">
                Atidaryti e-TAR
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
