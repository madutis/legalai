'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getUserProfile, saveUserProfile } from '@/lib/firebase/firestore';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';

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

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { status: subscriptionStatus } = useSubscription();
  const [context, setContext] = useState<UserContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);

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

  // Handle checkout success query param
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setShowCheckoutSuccess(true);
      // Remove query param from URL
      router.replace('/chat');
    }
  }, [searchParams, router]);

  // Show subscription modal for expired users
  useEffect(() => {
    if (subscriptionStatus === 'trial_expired' || subscriptionStatus === 'subscription_expired') {
      setShowSubscriptionModal(true);
    }
  }, [subscriptionStatus]);

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
      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />

      {/* Checkout Success Modal */}
      {showCheckoutSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-300"
          onClick={() => setShowCheckoutSuccess(false)}
        >
          <div
            className="relative bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative header gradient */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-gold/20 via-gold/10 to-transparent" />

            <div className="relative px-6 pt-8 pb-6 text-center">
              {/* Animated success icon with scales of justice */}
              <div className="relative w-20 h-20 mx-auto mb-5">
                {/* Outer ring animation */}
                <div className="absolute inset-0 rounded-full border-2 border-gold/30 animate-ping" style={{ animationDuration: '2s' }} />
                {/* Inner icon container */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/30 shadow-lg">
                  <svg className="w-10 h-10 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20" />
                    <path d="M2 6h20" />
                    <path d="M4 6l2 8h-4l2-8" />
                    <path d="M20 6l2 8h-4l2-8" />
                    <path d="M2 14a2 2 0 1 0 4 0" />
                    <path d="M18 14a2 2 0 1 0 4 0" />
                    <circle cx="12" cy="5" r="1.5" />
                  </svg>
                </div>
                {/* Checkmark overlay */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-card shadow-md animate-in zoom-in duration-300 delay-200">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
                Sveikiname!
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Jūsų prenumerata aktyvuota.<br />
                <span className="text-foreground/80">Neribotos konsultacijos laukia.</span>
              </p>

              <Button
                onClick={() => setShowCheckoutSuccess(false)}
                size="xl"
                className="w-full font-medium shadow-md hover:shadow-lg transition-shadow"
              >
                Pradėti konsultaciją
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>

              {/* Subtle confetti-like decorative elements */}
              <div className="absolute top-6 left-6 w-2 h-2 rounded-full bg-gold/40 animate-pulse" />
              <div className="absolute top-10 right-8 w-1.5 h-1.5 rounded-full bg-emerald-400/50 animate-pulse delay-100" />
              <div className="absolute top-8 left-12 w-1 h-1 rounded-full bg-gold/30 animate-pulse delay-200" />
            </div>
          </div>
        </div>
      )}

      <Header showAuth>
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
      </Header>

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

export default function ChatPage() {
  return (
    <Suspense fallback={
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
    }>
      <ChatPageContent />
    </Suspense>
  );
}
