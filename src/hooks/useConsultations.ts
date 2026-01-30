'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserConsultations } from '@/lib/firebase/consultations';
import type { ConsultationMeta } from '@/types';

interface UseConsultationsReturn {
  consultations: ConsultationMeta[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for fetching the user's saved consultations for sidebar list.
 * Returns metadata only (id, title, updatedAt, topic) to minimize reads.
 */
export function useConsultations(): UseConsultationsReturn {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<ConsultationMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!user) {
      setConsultations([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchConsultations() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getUserConsultations(user!.uid);
        if (!cancelled) {
          setConsultations(data);
        }
      } catch (err) {
        console.error('Failed to fetch consultations:', err);
        if (!cancelled) {
          setError('Nepavyko gauti konsultaciju saraso');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchConsultations();

    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  return {
    consultations,
    isLoading,
    error,
    refetch,
  };
}
