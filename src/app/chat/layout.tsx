'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { DeleteConsultationDialog } from '@/components/chat/DeleteConsultationDialog';
import { SavePrompt } from '@/components/chat/SavePrompt';
import { ConsultationProvider, useConsultation } from '@/contexts/ConsultationContext';
import { useConsultations } from '@/hooks/useConsultations';
import { useSavePreference } from '@/hooks/useSavePreference';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { deleteConsultation } from '@/lib/firebase/consultations';

function ChatLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { consultations, isLoading, refetch } = useConsultations();
  const { saveByDefault, setSaveByDefault } = useSavePreference();
  const {
    consultationId,
    consultation,
    loadConsultation,
    setSavePreference,
    clearConsultation,
  } = useConsultation();

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [consultationToDelete, setConsultationToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Save prompt state
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new' | 'load' | null>(null);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);

  // Handle new consultation click
  const handleNewConsultation = useCallback(() => {
    // If current chat has pending save preference, show prompt
    if (consultation && consultation.savePreference === 'pending' && consultation.messages.length > 0) {
      setPendingAction('new');
      setSavePromptOpen(true);
      return;
    }

    // Clear and go to onboarding
    clearConsultation();
    localStorage.removeItem('legalai-context');
    router.push('/');
  }, [consultation, clearConsultation, router]);

  // Handle select consultation from list
  const handleSelectConsultation = useCallback(
    async (id: string) => {
      // If current chat has pending save preference, show prompt
      if (
        consultation &&
        consultation.savePreference === 'pending' &&
        consultation.messages.length > 0 &&
        id !== consultationId
      ) {
        setPendingAction('load');
        setPendingLoadId(id);
        setSavePromptOpen(true);
        return;
      }

      // Load the selected consultation
      try {
        await loadConsultation(id);
      } catch (err) {
        console.error('Failed to load consultation:', err);
      }
    },
    [consultation, consultationId, loadConsultation]
  );

  // Handle delete click
  const handleDeleteClick = useCallback((id: string, title: string) => {
    setConsultationToDelete({ id, title });
    setDeleteDialogOpen(true);
  }, []);

  // Confirm delete
  const handleDeleteConfirm = useCallback(async () => {
    if (!consultationToDelete || !user) return;

    try {
      await deleteConsultation(user.uid, consultationToDelete.id);
      refetch();

      // If deleting the current consultation, clear it
      if (consultationToDelete.id === consultationId) {
        clearConsultation();
      }
    } catch (err) {
      console.error('Failed to delete consultation:', err);
    } finally {
      setDeleteDialogOpen(false);
      setConsultationToDelete(null);
    }
  }, [consultationToDelete, user, refetch, consultationId, clearConsultation]);

  // Handle "don't save" current chat
  const handleDontSaveCurrentChat = useCallback(() => {
    setSavePreference('dont_save');
  }, [setSavePreference]);

  // Handle save-by-default toggle
  const handleToggleSaveByDefault = useCallback(
    (value: boolean) => {
      setSaveByDefault(value);
    },
    [setSaveByDefault]
  );

  // Save prompt handlers
  const handleSavePromptSave = useCallback(async () => {
    setSavePreference('save');
    setSavePromptOpen(false);

    // Continue with pending action
    if (pendingAction === 'new') {
      clearConsultation();
      localStorage.removeItem('legalai-context');
      router.push('/');
    } else if (pendingAction === 'load' && pendingLoadId) {
      try {
        await loadConsultation(pendingLoadId);
      } catch (err) {
        console.error('Failed to load consultation:', err);
      }
    }

    setPendingAction(null);
    setPendingLoadId(null);
  }, [setSavePreference, pendingAction, pendingLoadId, clearConsultation, router, loadConsultation]);

  const handleSavePromptDontSave = useCallback(async () => {
    setSavePreference('dont_save');
    setSavePromptOpen(false);

    // Continue with pending action
    if (pendingAction === 'new') {
      clearConsultation();
      localStorage.removeItem('legalai-context');
      router.push('/');
    } else if (pendingAction === 'load' && pendingLoadId) {
      try {
        await loadConsultation(pendingLoadId);
      } catch (err) {
        console.error('Failed to load consultation:', err);
      }
    }

    setPendingAction(null);
    setPendingLoadId(null);
  }, [setSavePreference, pendingAction, pendingLoadId, clearConsultation, router, loadConsultation]);

  const handleSavePromptCancel = useCallback(() => {
    setSavePromptOpen(false);
    setPendingAction(null);
    setPendingLoadId(null);
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <ChatSidebar
        consultations={consultations}
        selectedConsultationId={consultationId}
        onSelectConsultation={handleSelectConsultation}
        onDeleteConsultation={handleDeleteClick}
        onNewConsultation={handleNewConsultation}
        onDontSaveCurrentChat={handleDontSaveCurrentChat}
        onToggleSaveByDefault={handleToggleSaveByDefault}
        isLoading={isLoading}
        saveByDefault={saveByDefault}
        isSubscribed={isSubscribed}
        hasActiveChat={!!consultation && consultation.messages.length > 0}
        currentChatSavePreference={consultation?.savePreference}
      />
      <SidebarInset>{children}</SidebarInset>

      {/* Delete dialog */}
      <DeleteConsultationDialog
        isOpen={deleteDialogOpen}
        consultationTitle={consultationToDelete?.title || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setConsultationToDelete(null);
        }}
      />

      {/* Save prompt */}
      <SavePrompt
        isOpen={savePromptOpen}
        onSave={handleSavePromptSave}
        onDontSave={handleSavePromptDontSave}
        onCancel={handleSavePromptCancel}
      />
    </SidebarProvider>
  );
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConsultationProvider>
      <ChatLayoutInner>{children}</ChatLayoutInner>
    </ConsultationProvider>
  );
}
