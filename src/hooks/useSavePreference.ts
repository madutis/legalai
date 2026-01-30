'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

interface UseSavePreferenceReturn {
  saveByDefault: boolean;
  isLoading: boolean;
  setSaveByDefault: (value: boolean) => Promise<void>;
}

/**
 * Hook for reading/writing the user's save-by-default preference.
 * Stored in users/{uid}.saveByDefault field.
 * Default: true (save by default per CONTEXT.md)
 */
export function useSavePreference(): UseSavePreferenceReturn {
  const { user } = useAuth();
  const [saveByDefault, setSaveByDefaultState] = useState(true); // Default true
  const [isLoading, setIsLoading] = useState(true);

  // Listen for real-time updates to the user document
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const db = getFirebaseFirestore();
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Default to true if field doesn't exist
          setSaveByDefaultState(data.saveByDefault !== false);
        } else {
          setSaveByDefaultState(true);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to save preference:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const setSaveByDefault = useCallback(
    async (value: boolean): Promise<void> => {
      if (!user) return;

      const db = getFirebaseFirestore();
      const userRef = doc(db, 'users', user.uid);

      await setDoc(userRef, { saveByDefault: value }, { merge: true });
      // Local state will be updated by onSnapshot listener
    },
    [user]
  );

  return {
    saveByDefault,
    isLoading,
    setSaveByDefault,
  };
}
