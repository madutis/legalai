'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  createConsultation,
  getConsultation,
  updateConsultation,
} from '@/lib/firebase/consultations';
import { debounce } from '@/lib/utils/debounce';
import { generateConsultationTitle } from '@/lib/gemini/title';
import type {
  ConsultationDocument,
  ConsultationMessage,
} from '@/types';

interface ConsultationContextValue {
  consultationId: string | null;
  consultation: ConsultationDocument | null;
  isLoading: boolean;

  // Actions
  startNewConsultation: (context: {
    userRole: string;
    companySize: string;
    topic: string;
  }, savePreference?: 'save' | 'dont_save' | 'pending') => Promise<string>;
  loadConsultation: (id: string) => Promise<void>;
  updateMessages: (messages: ConsultationMessage[]) => void;
  setTitle: (title: string) => void;
  setSavePreference: (pref: 'save' | 'dont_save') => void;
  clearConsultation: () => void;
}

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

export function useConsultation(): ConsultationContextValue {
  const context = useContext(ConsultationContext);
  if (!context) {
    throw new Error('useConsultation must be used within a ConsultationProvider');
  }
  return context;
}

// Debounce delay for auto-save (2 seconds)
const SAVE_DEBOUNCE_MS = 2000;

export function ConsultationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<ConsultationDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Ref to track the current consultation ID for debounced save
  const consultationIdRef = useRef<string | null>(null);
  const userRef = useRef(user);

  // Keep refs in sync
  useEffect(() => {
    consultationIdRef.current = consultationId;
  }, [consultationId]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Create debounced save function
  const debouncedSaveRef = useRef(
    debounce(async (messages: ConsultationMessage[], savePreference: 'save' | 'dont_save' | 'pending') => {
      const currentId = consultationIdRef.current;
      const currentUser = userRef.current;

      if (!currentId || !currentUser?.uid) return;
      if (savePreference !== 'save') return; // Only auto-save if preference is 'save'

      try {
        await updateConsultation(currentUser.uid, currentId, {
          messages,
        });
      } catch (err) {
        console.error('Failed to auto-save consultation:', err);
      }
    }, SAVE_DEBOUNCE_MS)
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    const debouncedSave = debouncedSaveRef.current;
    return () => {
      debouncedSave.cancel();
    };
  }, []);

  // Track if title generation has been attempted for current consultation
  const titleGenerationAttemptedRef = useRef<string | null>(null);

  // Auto-generate title after first user+assistant exchange
  useEffect(() => {
    if (!consultation || !consultationId || !user?.uid) return;

    // Skip if already has a non-placeholder title
    if (consultation.title && consultation.title !== 'Nauja konsultacija') return;

    // Skip if we already attempted for this consultation
    if (titleGenerationAttemptedRef.current === consultationId) return;

    const messages = consultation.messages;
    if (messages.length < 2) return;

    // Find first user and assistant messages
    const userMsg = messages.find(m => m.role === 'user');
    const assistantMsg = messages.find(m => m.role === 'assistant');

    // Need both messages with content
    if (!userMsg || !assistantMsg || !assistantMsg.content) return;

    // Mark as attempted to prevent duplicate calls
    titleGenerationAttemptedRef.current = consultationId;

    // Generate title async - don't block
    generateConsultationTitle(userMsg.content, assistantMsg.content)
      .then(title => {
        // Update local state
        setConsultation((prev) => {
          if (!prev) return prev;
          return { ...prev, title, updatedAt: new Date() };
        });
        // Persist title to Firestore
        updateConsultation(user.uid, consultationId, { title }).catch(err => {
          console.error('Failed to save title:', err);
        });
      })
      .catch(err => {
        console.error('Title generation failed:', err);
        // Keep empty title, will use fallback in display
      });
  }, [consultation?.messages.length, consultationId, consultation?.title, user?.uid]);

  /**
   * Start a new consultation - creates a Firestore doc with status='active'
   * @param savePreference - Initial save preference (default: 'pending')
   * @returns The new consultation ID
   */
  const startNewConsultation = useCallback(async (context: {
    userRole: string;
    companySize: string;
    topic: string;
  }, savePreference: 'save' | 'dont_save' | 'pending' = 'pending'): Promise<string> => {
    if (!user) {
      throw new Error('User must be authenticated to start a consultation');
    }

    setIsLoading(true);
    try {
      const newId = await createConsultation(user.uid, {
        status: 'active',
        savePreference,
        context,
        messages: [],
      });

      const now = new Date();
      setConsultationId(newId);
      setConsultation({
        id: newId,
        title: '',
        createdAt: now,
        updatedAt: now,
        status: 'active',
        savePreference,
        context,
        messages: [],
      });

      return newId;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Load an existing consultation by ID
   */
  const loadConsultation = useCallback(async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated to load a consultation');
    }

    setIsLoading(true);
    try {
      const doc = await getConsultation(user.uid, id);
      if (doc) {
        setConsultationId(id);
        setConsultation(doc);
      } else {
        throw new Error('Consultation not found');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Update messages in local state and trigger debounced Firestore save
   */
  const updateMessages = useCallback((messages: ConsultationMessage[]): void => {
    setConsultation((prev) => {
      if (!prev) return prev;

      // Trigger debounced save with current save preference
      debouncedSaveRef.current(messages, prev.savePreference);

      return {
        ...prev,
        messages,
        updatedAt: new Date(),
      };
    });
  }, []);

  /**
   * Set consultation title in local state (Firestore update handled in Plan 04)
   */
  const setTitle = useCallback((title: string): void => {
    setConsultation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        title,
        updatedAt: new Date(),
      };
    });
  }, []);

  /**
   * Set save preference in local state and persist to Firestore
   */
  const setSavePreference = useCallback((pref: 'save' | 'dont_save'): void => {
    setConsultation((prev) => {
      if (!prev) return prev;

      // Persist save preference change to Firestore immediately
      if (user && consultationId) {
        updateConsultation(user.uid, consultationId, {
          savePreference: pref,
          // If changing to 'save', also save current messages
          ...(pref === 'save' ? { messages: prev.messages } : {}),
        }).catch((err) => {
          console.error('Failed to update save preference:', err);
        });
      }

      return {
        ...prev,
        savePreference: pref,
        updatedAt: new Date(),
      };
    });
  }, [user, consultationId]);

  /**
   * Clear current consultation state for new chat
   */
  const clearConsultation = useCallback((): void => {
    // Cancel any pending debounced save
    debouncedSaveRef.current.cancel();
    setConsultationId(null);
    setConsultation(null);
  }, []);

  return (
    <ConsultationContext.Provider
      value={{
        consultationId,
        consultation,
        isLoading,
        startNewConsultation,
        loadConsultation,
        updateMessages,
        setTitle,
        setSavePreference,
        clearConsultation,
      }}
    >
      {children}
    </ConsultationContext.Provider>
  );
}
