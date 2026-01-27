'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import Link from 'next/link';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [loading, user, router]);

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem('legalai-context');
    router.push('/');
  };

  // Show loading while checking auth
  if (loading || !user) {
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
      <Header>
        <Link
          href="/chat"
          className="flex-shrink-0 text-xs sm:text-sm rounded-lg border border-border hover:bg-muted transition-colors px-3 py-1.5 sm:py-2 flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Grįžti</span>
        </Link>
      </Header>

      {/* Page Title Bar - matches chat context bar */}
      <div className="bg-muted/50 border-b border-border/50 px-3 sm:px-4 py-2 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 bg-gold/10 text-gold px-2.5 py-1 rounded-lg font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Paskyra</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 flex flex-col items-center space-y-4">
          {/* Subscription Status Card */}
          <SubscriptionStatus />

          {/* User Info Card */}
          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-sm overflow-hidden animate-fade-up" style={{ opacity: 0 }}>
              {/* User Header */}
              <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-lg font-semibold text-primary border-2 border-gold/20">
                  <span className="font-serif">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">
                    {user.email || 'Nenustatytas'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Prisijungta su Google
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-4 space-y-3">
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full h-10 text-destructive hover:text-destructive hover:bg-destructive/5 border-border"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Atsijungti
                </Button>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-center text-xs text-muted-foreground/60 mt-6 leading-relaxed max-w-md">
            Jūsų profilio nustatymai ir konsultacijų istorija saugoma saugiai.
          </p>
        </div>
      </main>
    </div>
  );
}
