'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  createConsultation,
  getConsultation,
} from '@/lib/firebase/consultations';
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
  }) => Promise<string>;
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

export function ConsultationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<ConsultationDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Start a new consultation - creates a Firestore doc with status='active', savePreference='pending'
   * @returns The new consultation ID
   */
  const startNewConsultation = useCallback(async (context: {
    userRole: string;
    companySize: string;
    topic: string;
  }): Promise<string> => {
    if (!user) {
      throw new Error('User must be authenticated to start a consultation');
    }

    setIsLoading(true);
    try {
      const newId = await createConsultation(user.uid, {
        status: 'active',
        savePreference: 'pending',
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
        savePreference: 'pending',
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
   * Update messages in local state (Firestore persistence handled by debounce in Plan 03)
   */
  const updateMessages = useCallback((messages: ConsultationMessage[]): void => {
    setConsultation((prev) => {
      if (!prev) return prev;
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
   * Set save preference in local state
   */
  const setSavePreference = useCallback((pref: 'save' | 'dont_save'): void => {
    setConsultation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        savePreference: pref,
        updatedAt: new Date(),
      };
    });
  }, []);

  /**
   * Clear current consultation state for new chat
   */
  const clearConsultation = useCallback((): void => {
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
