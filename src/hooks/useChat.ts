'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, ChatSource, ConsultationMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Re-export for backwards compatibility
export type Message = ChatMessage;
export type { ChatSource };

interface ChatContext {
  userRole?: string;
  companySize?: string;
  topic?: string;
}

interface UsageInfo {
  remaining: number;
  showWarning: boolean;
}

interface UseChatOptions {
  context?: ChatContext;
  userId?: string;
  /** Callback to sync messages with ConsultationContext */
  onMessagesChange?: (messages: ConsultationMessage[]) => void;
  /** Initial messages to load (from loaded consultation) */
  initialMessages?: ChatMessage[];
}

// Convert ChatMessage to ConsultationMessage
function toConsultationMessage(m: ChatMessage): ConsultationMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    sources: m.sources,
    timestamp: new Date(),
  };
}

// Check if a message is a final answer (no questions)
function isFinalAnswer(content: string): boolean {
  return !content.includes('[KLAUSIMAS]') && !content.includes('[ATVIRAS_KLAUSIMAS]') && content.length > 100;
}

export function useChat(options?: UseChatOptions) {
  const { context, userId, onMessagesChange, initialMessages } = options || {};
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [consultationFinishedAt, setConsultationFinishedAt] = useState<number | null>(null);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<string | null>(null);
  const triedFallbackRef = useRef(false);
  const onMessagesChangeRef = useRef(onMessagesChange);

  // Keep ref in sync
  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  // Update messages when initialMessages change (loading a different consultation)
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
      setConsultationFinishedAt(null);
      setFollowUpCount(0);
    }
  }, [initialMessages]);

  const MAX_FOLLOW_UPS = 5;
  const isConsultationComplete = consultationFinishedAt !== null && followUpCount >= MAX_FOLLOW_UPS;

  // Sync messages to consultation context when they change
  const syncMessagesToContext = useCallback((msgs: Message[]) => {
    if (onMessagesChangeRef.current) {
      const consultationMessages = msgs.map(toConsultationMessage);
      onMessagesChangeRef.current(consultationMessages);
    }
  }, []);

  const sendMessageInternal = useCallback(async (
    content: string,
    useFallbackModel: boolean = false,
    existingAssistantId?: string
  ) => {
    // Generate IDs together to avoid race condition where Date.now() changes between calls
    const now = Date.now();
    const userMessageId = now.toString();
    const assistantId = existingAssistantId || (now + 1).toString();

    // Only add user message and assistant placeholder if this is a new message (not retry)
    if (!existingAssistantId) {
      // Track follow-up if consultation already finished
      if (consultationFinishedAt !== null) {
        setFollowUpCount((prev) => prev + 1);
      }

      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        content,
      };
      setMessages((prev) => {
        const newMessages = [...prev, userMessage];
        // Sync user message immediately
        syncMessagesToContext(newMessages);
        return newMessages;
      });
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', sources: [] },
      ]);
    } else {
      // Reset the assistant message content for retry
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: '', sources: [] } : m
        )
      );
    }

    setIsLoading(true);
    setStatus(null);
    setError(null);
    setCanRetry(false);
    lastMessageRef.current = content;

    // Send welcome email on first message (API handles deduplication)
    if (userId && user?.email) {
      fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userId,
          email: user.email,
          name: user.displayName || undefined,
        }),
      }).catch((err) => {
        console.error('Failed to send welcome email:', err);
      });
    }

    abortControllerRef.current = new AbortController();

    try {
      // Get auth token for usage tracking
      const idToken = user ? await user.getIdToken() : null;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context,
          useFallbackModel,
        }),
        signal: abortControllerRef.current.signal,
      });

      // Handle usage limit reached or deleted account
      if (response.status === 429) {
        const data = await response.json();
        if (data.error === 'limit_reached') {
          setLimitReached(true);
          setError(null);
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setIsLoading(false);
          return;
        }
        if (data.error === 'deleted_account') {
          setSubscriptionRequired(true);
          setError(null);
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setIsLoading(false);
          return;
        }
      }

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);

          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'status') {
              setStatus(parsed.status);
            } else if (parsed.type === 'usage') {
              setUsageInfo({
                remaining: parsed.remaining,
                showWarning: parsed.showWarning,
              });
            } else if (parsed.type === 'metadata') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources: parsed.sources } : m
                )
              );
            } else if (parsed.type === 'text') {
              setStatus(null); // Clear status when text starts
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.content }
                    : m
                )
              );
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message);
            }
          } catch (e) {
            if (e instanceof Error && e.message) throw e;
            // Skip invalid JSON
          }
        }
      }

      // Streaming complete - sync final messages to context
      setMessages((prev) => {
        const lastAssistant = prev.find((m) => m.id === assistantId);
        if (lastAssistant && isFinalAnswer(lastAssistant.content) && consultationFinishedAt === null) {
          setConsultationFinishedAt(Date.now());
        }
        // Sync complete messages to context for persistence
        syncMessagesToContext(prev);
        return prev;
      });

      // Success - reset fallback flag
      triedFallbackRef.current = false;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      // If primary model failed and we haven't tried fallback yet, retry with fallback
      if (!useFallbackModel && !triedFallbackRef.current) {
        console.log('Primary model failed, trying fallback...');
        triedFallbackRef.current = true;
        setIsLoading(false);
        return sendMessageInternal(content, true, assistantId);
      }

      // Both models failed - show error with retry option
      setError('Nepavyko gauti atsakymo. Bandykite dar kartą.');
      setCanRetry(true);
      triedFallbackRef.current = false;
      // Remove the placeholder message on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, context, consultationFinishedAt, userId, user, syncMessagesToContext]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || isConsultationComplete) return;
    triedFallbackRef.current = false;
    return sendMessageInternal(content, false);
  }, [isLoading, isConsultationComplete, sendMessageInternal]);

  const retry = useCallback(() => {
    if (lastMessageRef.current && !isLoading) {
      triedFallbackRef.current = false;
      sendMessageInternal(lastMessageRef.current, false);
    }
  }, [isLoading, sendMessageInternal]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setCanRetry(false);
    setConsultationFinishedAt(null);
    setFollowUpCount(0);
  }, []);

  const remainingFollowUps = Math.max(0, MAX_FOLLOW_UPS - followUpCount);
  const isConsultationFinished = consultationFinishedAt !== null;

  // Function to dismiss limit reached state
  const dismissLimitReached = useCallback(() => {
    setLimitReached(false);
  }, []);

  // Function to dismiss usage warning
  const dismissUsageWarning = useCallback(() => {
    setUsageInfo((prev) => prev ? { ...prev, showWarning: false } : null);
  }, []);

  return {
    messages,
    isLoading,
    status,
    error,
    canRetry,
    sendMessage,
    stopGeneration,
    clearMessages,
    retry,
    // Consultation state
    isConsultationFinished,
    isConsultationComplete,
    remainingFollowUps,
    context,
    // Usage state
    usageInfo,
    limitReached,
    subscriptionRequired,
    dismissLimitReached,
    dismissUsageWarning,
  };
}
