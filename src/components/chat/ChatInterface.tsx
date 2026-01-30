'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useChat, type ChatSource } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { useConsultation } from '@/contexts/ConsultationContext';
import { Button } from '@/components/ui/button';
import { RulingModal } from './RulingModal';
import { ArticleModal } from './ArticleModal';
import { AssistantMessage } from './AssistantMessage';
import { SourcesList } from './SourcesList';
import { ChatInput } from './ChatInput';
import { exportToPDF } from '@/lib/pdf-export';
import { UsageWarning } from '@/components/subscription/UsageWarning';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { toChatMessages } from '@/lib/utils/messageConverter';

interface ChatInterfaceProps {
  topic?: string;
  userRole?: string;
  companySize?: string;
}

export function ChatInterface({ topic, userRole, companySize }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { consultation, consultationId, updateMessages } = useConsultation();
  const [input, setInput] = useState('');
  const [selectedRulingDocId, setSelectedRulingDocId] = useState<string | null>(null);
  const [selectedArticleNumber, setSelectedArticleNumber] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const isReturningUser = !!user;

  // Convert loaded consultation messages to ChatMessage format
  // Memoize to prevent infinite re-renders when consultation changes
  const initialMessages = useMemo(() => {
    if (consultation?.messages && consultation.messages.length > 0) {
      return toChatMessages(consultation.messages);
    }
    return undefined;
  }, [consultationId]); // Only recalculate when consultation ID changes

  // Callback to sync messages with ConsultationContext
  const handleMessagesChange = useCallback((msgs: Parameters<typeof updateMessages>[0]) => {
    updateMessages(msgs);
  }, [updateMessages]);

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
    usageInfo,
    limitReached,
    subscriptionRequired,
    dismissLimitReached,
    dismissUsageWarning,
  } = useChat({
    context: { topic, userRole, companySize },
    userId: user?.uid,
    initialMessages,
    onMessagesChange: handleMessagesChange,
  });

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Show subscription modal when required (deleted account without subscription)
  useEffect(() => {
    if (subscriptionRequired) {
      setShowSubscriptionModal(true);
    }
  }, [subscriptionRequired]);

  const handleExportPDF = () => {
    exportToPDF({
      messages,
      context: { topic, userRole, companySize },
      exportedAt: new Date(),
    });
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
      isNearBottomRef.current = true;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
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
            <h2 className="font-serif text-xl font-semibold text-foreground mb-2">{isReturningUser ? 'Sveiki sugrįžę!' : 'Sveiki atvykę'}</h2>
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
                              .flatMap(m => m.sources || []) as ChatSource[];
                          }
                          return (message.sources || []) as ChatSource[];
                        })()}
                      />
                    )}

                    {/* Sources */}
                    {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                      <SourcesList
                        sources={message.sources}
                        content={message.content}
                        onRulingClick={setSelectedRulingDocId}
                        onArticleClick={setSelectedArticleNumber}
                      />
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
        <div role="alert" className="mx-4 mb-2 px-4 py-3 bg-destructive/10 text-destructive text-sm rounded-xl flex items-center justify-between border border-destructive/20">
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
      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        isConsultationFinished={isConsultationFinished}
        isConsultationComplete={isConsultationComplete}
        remainingFollowUps={remainingFollowUps}
        onSubmit={handleSubmit}
        onStop={stopGeneration}
        onExportPDF={handleExportPDF}
      />

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

      {/* Usage warning toast */}
      {usageInfo?.showWarning && usageInfo.remaining <= 5 && (
        <UsageWarning
          remaining={usageInfo.remaining}
          onDismiss={dismissUsageWarning}
        />
      )}

      {/* Usage limit reached modal */}
      <UsageLimitModal
        isOpen={limitReached}
        onClose={dismissLimitReached}
      />

      {/* Subscription required modal (for deleted accounts) */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
}
