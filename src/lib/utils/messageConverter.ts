import type { ChatMessage, ConsultationMessage } from '@/types';

/**
 * Convert a ConsultationMessage (Firestore) to ChatMessage (useChat)
 * Strips timestamp as ChatMessage doesn't need it
 */
export function toChatMessage(m: ConsultationMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    sources: m.sources,
  };
}

/**
 * Convert a ChatMessage (useChat) to ConsultationMessage (Firestore)
 * Adds timestamp for persistence
 */
export function toConsultationMessage(m: ChatMessage): ConsultationMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    sources: m.sources,
    timestamp: new Date(),
  };
}

/**
 * Batch convert ConsultationMessage[] to ChatMessage[]
 * Used when loading a saved consultation into the chat UI
 */
export function toChatMessages(messages: ConsultationMessage[]): ChatMessage[] {
  return messages.map(toChatMessage);
}

/**
 * Batch convert ChatMessage[] to ConsultationMessage[]
 * Used when saving current chat to Firestore
 */
export function toConsultationMessages(messages: ChatMessage[]): ConsultationMessage[] {
  return messages.map(toConsultationMessage);
}
