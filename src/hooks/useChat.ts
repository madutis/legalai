'use client';

import { useState, useCallback, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: {
    docId: string;
    docType: string;
    sourceFile: string;
    score: number;
  }[];
}

interface ChatContext {
  userRole?: string;
  companySize?: string;
  topic?: string;
}

export function useChat(context?: ChatContext) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<string | null>(null);
  const triedFallbackRef = useRef(false);

  const sendMessageInternal = useCallback(async (
    content: string,
    useFallbackModel: boolean = false,
    existingAssistantId?: string
  ) => {
    const assistantId = existingAssistantId || (Date.now() + 1).toString();

    // Only add user message and assistant placeholder if this is a new message (not retry)
    if (!existingAssistantId) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
      };
      setMessages((prev) => [...prev, userMessage]);
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
    setError(null);
    setCanRetry(false);
    lastMessageRef.current = content;

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let receivedContent = false;

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

            if (parsed.type === 'metadata') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources: parsed.sources } : m
                )
              );
            } else if (parsed.type === 'text') {
              receivedContent = true;
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
  }, [messages, context]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    triedFallbackRef.current = false;
    return sendMessageInternal(content, false);
  }, [isLoading, sendMessageInternal]);

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
  }, []);

  return {
    messages,
    isLoading,
    error,
    canRetry,
    sendMessage,
    stopGeneration,
    clearMessages,
    retry,
  };
}
