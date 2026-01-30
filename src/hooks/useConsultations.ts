'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, orderBy, limit as firestoreLimit, onSnapshot, Timestamp } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import type { ConsultationMeta } from '@/types';

interface UseConsultationsReturn {
  consultations: ConsultationMeta[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function timestampToDate(ts: Timestamp | undefined): Date {
  return ts?.toDate() ?? new Date();
}

/**
 * Hook for fetching the user's saved consultations for sidebar list.
 * Uses real-time listener for instant updates when consultations are saved.
 * Returns metadata only (id, title, updatedAt, topic) to minimize reads.
 */
export function useConsultations(): UseConsultationsReturn {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<ConsultationMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // refetch is now a no-op since we use real-time listener
  const refetch = useCallback(() => {}, []);

  useEffect(() => {
    if (!user) {
      setConsultations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const db = getFirebaseFirestore();
    const consultationsRef = collection(db, 'users', user.uid, 'consultations');

    const q = query(
      consultationsRef,
      where('savePreference', '==', 'save'),
      orderBy('updatedAt', 'desc'),
      firestoreLimit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnapshot) => {
          const docData = docSnapshot.data();
          return {
            id: docSnapshot.id,
            title: (docData.title as string) ?? '',
            updatedAt: timestampToDate(docData.updatedAt as Timestamp | undefined),
            topic: (docData.context as Record<string, unknown>)?.topic as string ?? '',
          };
        });
        setConsultations(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Failed to listen to consultations:', err);
        setError('Nepavyko gauti konsultacijų sąrašo');
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  return {
    consultations,
    isLoading,
    error,
    refetch,
  };
}
