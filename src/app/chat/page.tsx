'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, saveUserProfile } from '@/lib/firebase/firestore';
import Link from 'next/link';

interface UserContext {
  userRole: string;
  companySize: string;
  topic: string;
}

const ROLE_LABELS: Record<string, string> = {
  employer: 'Darbdavys',
  employee: 'Darbuotojas',
  hr: 'HR',
  other: 'Kita',
};

const TOPIC_LABELS: Record<string, string> = {
  hiring: 'Įdarbinimas',
  termination: 'Atleidimas',
  leave: 'Atostogos',
  wages: 'Darbo užmokestis',
  disciplinary: 'Drausminė atsakomybė',
  material: 'Materialinė atsakomybė',
  contracts: 'Darbo sutartys',
  safety: 'Darbo sauga',
  other: 'Kitas klausimas',
};

const TOPIC_ICONS: Record<string, React.ReactNode> = {
  hiring: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  termination: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  leave: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  wages: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  disciplinary: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  material: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <path d="M3 3l18 18" />
    </svg>
  ),
  contracts: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  safety: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  other: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

export default function ChatPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [context, setContext] = useState<UserContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);

  // Auth check - redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [authLoading, user, router]);

  // Context check - load from Firestore first, fallback to localStorage
  useEffect(() => {
    if (authLoading || !user) return;

    async function loadContext() {
      try {
        // Try Firestore first
        const firestoreProfile = await getUserProfile(user!.uid);

        if (firestoreProfile) {
          // Firestore has profile, use it and sync to localStorage
          const contextData = {
            userRole: firestoreProfile.userRole,
            companySize: firestoreProfile.companySize,
            topic: firestoreProfile.topic,
          };
          setContext(contextData);
          localStorage.setItem('legalai-context', JSON.stringify(contextData));
          setContextLoading(false);
          return;
        }

        // Firestore empty, check localStorage
        const saved = localStorage.getItem('legalai-context');
        if (saved) {
          try {
            const localContext = JSON.parse(saved);
            setContext(localContext);

            // Migrate localStorage to Firestore
            await saveUserProfile(user!.uid, localContext);

            setContextLoading(false);
            return;
          } catch {
            // Invalid localStorage data
          }
        }

        // Neither has context, redirect to onboarding
        router.push('/');
      } catch (err) {
        console.error('Failed to load profile:', err);
        // Fallback to localStorage on Firestore error
        const saved = localStorage.getItem('legalai-context');
        if (saved) {
          try {
            setContext(JSON.parse(saved));
            setContextLoading(false);
            return;
          } catch {
            // Invalid localStorage data
          }
        }
        router.push('/');
      }
    }

    loadContext();
  }, [authLoading, user, router]);

  const handleNewConsultation = () => {
    localStorage.removeItem('legalai-context');
    router.push('/');
  };

  // Show loading while checking auth or context
  if (authLoading || contextLoading || !context) {
    return (
      <div className="h-[100svh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M2 6h20" />
              <path d="M4 6l2 8h-4l2-8" />
              <path d="M20 6l2 8h-4l2-8" />
              <path d="M2 14a2 2 0 1 0 4 0" />
              <path d="M18 14a2 2 0 1 0 4 0" />
              <circle cx="12" cy="5" r="1.5" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">Kraunama...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100svh] flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md flex-shrink-0 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="M2 6h20" />
                <path d="M4 6l2 8h-4l2-8" />
                <path d="M20 6l2 8h-4l2-8" />
                <path d="M2 14a2 2 0 1 0 4 0" />
                <path d="M18 14a2 2 0 1 0 4 0" />
                <circle cx="12" cy="5" r="1.5" />
              </svg>
            </div>
            <span className="font-serif font-semibold text-sm sm:text-base tracking-tight">LegalAI</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewConsultation}
              className="flex-shrink-0 text-xs sm:text-sm rounded-lg border-border hover:bg-muted transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nauja konsultacija</span>
              <span className="sm:hidden">Nauja</span>
            </Button>

            {/* User Avatar */}
            <Link
              href="/account"
              className="relative w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-sm font-semibold text-primary border-2 border-transparent hover:border-gold/50 transition-all duration-200 hover:scale-105 hover:shadow-sm group"
              title={user?.email || 'Paskyra'}
            >
              <span className="font-serif">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
              {/* Subtle gold glow on hover */}
              <span className="absolute inset-0 rounded-full bg-gold/0 group-hover:bg-gold/5 transition-colors duration-200" />
            </Link>
          </div>
        </div>
      </header>

      {/* Context Summary */}
      <div className="bg-muted/50 border-b border-border/50 px-3 sm:px-4 py-2 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center gap-2 sm:gap-3 text-xs sm:text-sm overflow-x-auto">
          <span className="text-muted-foreground hidden sm:inline flex-shrink-0">Konsultacija:</span>

          {/* Topic with icon */}
          <div className="flex items-center gap-1.5 bg-gold/10 text-gold px-2.5 py-1 rounded-lg font-medium flex-shrink-0">
            {TOPIC_ICONS[context.topic] || TOPIC_ICONS.other}
            <span>{TOPIC_LABELS[context.topic] || context.topic}</span>
          </div>

          {/* Separator */}
          <span className="text-border hidden sm:inline">•</span>

          {/* Role */}
          <span className="bg-card border border-border px-2.5 py-1 rounded-lg text-foreground flex-shrink-0">
            {ROLE_LABELS[context.userRole] || context.userRole}
          </span>

          {/* Company size */}
          <span className="bg-card border border-border px-2.5 py-1 rounded-lg text-foreground flex-shrink-0">
            {context.companySize} darb.
          </span>

          {/* Edit button */}
          <button
            onClick={handleNewConsultation}
            className="text-muted-foreground hover:text-foreground ml-auto text-xs flex-shrink-0 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="hidden sm:inline">Keisti</span>
          </button>
        </div>
      </div>

      {/* Chat */}
      <main className="flex-1 overflow-hidden">
        <ChatInterface
          userRole={context.userRole}
          companySize={context.companySize}
          topic={context.topic}
        />
      </main>
    </div>
  );
}
