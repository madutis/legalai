'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isConsultationFinished: boolean;
  isConsultationComplete: boolean;
  remainingFollowUps: number;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  onExportPDF: () => void;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  isConsultationFinished,
  isConsultationComplete,
  remainingFollowUps,
  onSubmit,
  onStop,
  onExportPDF,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  if (isConsultationComplete) {
    return (
      <div className="flex-shrink-0 border-t border-border/50 bg-background px-3 sm:px-4 py-3 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
              onClick={onExportPDF}
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
        <p className="text-xs text-muted-foreground/60 mt-3 text-center">
          Tai nėra teisinė konsultacija. Sudėtingais atvejais kreipkitės į teisininką.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 border-t border-border/50 bg-background px-3 sm:px-4 py-3 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {isConsultationFinished && remainingFollowUps > 0 && (
        <div className="max-w-4xl mx-auto mb-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Galite užduoti dar {remainingFollowUps} {remainingFollowUps === 1 ? 'papildomą klausimą' : 'papildomus klausimus'}
          </p>
          <Button
            onClick={onExportPDF}
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
      <form onSubmit={onSubmit} className="flex gap-2 sm:gap-3 max-w-4xl mx-auto">
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
            onClick={onStop}
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
      <p className="text-xs text-muted-foreground/60 mt-3 text-center">
        Tai nėra teisinė konsultacija. Sudėtingais atvejais kreipkitės į teisininką.
      </p>
    </div>
  );
}
