'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';
import {
  signInWithGoogle,
  sendMagicLink,
  completeMagicLinkSignIn,
  isMagicLinkCallback,
} from '@/lib/firebase/auth';

export default function SignInPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingMagicLink, setLoadingMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingCallback, setProcessingCallback] = useState(false);

  // Check for magic link callback on mount
  useEffect(() => {
    async function handleMagicLinkCallback() {
      if (isMagicLinkCallback()) {
        setProcessingCallback(true);
        try {
          await completeMagicLinkSignIn();
          // Auth state will update via onAuthStateChanged
        } catch (err) {
          setError('Nepavyko prisijungti su nuoroda. Bandykite dar kartą.');
          console.error('Magic link sign-in error:', err);
        } finally {
          setProcessingCallback(false);
        }
      }
    }

    handleMagicLinkCallback();
  }, []);

  // Redirect if already authenticated - always go to / (onboarding handles routing)
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
      // Redirect handled by useEffect
    } catch (err) {
      setError('Nepavyko prisijungti su Google. Bandykite dar kartą.');
      console.error('Google sign-in error:', err);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setLoadingMagicLink(true);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/sign-in`,
        handleCodeInApp: true,
      };
      await sendMagicLink(email, actionCodeSettings);
      setMagicLinkSent(true);
    } catch (err) {
      setError('Nepavyko išsiųsti nuorodos. Patikrinkite el. pašto adresą.');
      console.error('Magic link error:', err);
    } finally {
      setLoadingMagicLink(false);
    }
  };

  // Show loading while checking auth or processing callback
  if (authLoading || processingCallback) {
    return (
      <div className="min-h-screen bg-background texture-paper flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Don't show form if already logged in (will redirect)
  if (user) {
    return (
      <div className="min-h-screen bg-background texture-paper flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background texture-paper flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20" />
                <path d="M2 6h20" />
                <path d="M4 6l2 8h-4l2-8" />
                <path d="M20 6l2 8h-4l2-8" />
                <path d="M2 14a2 2 0 1 0 4 0" />
                <path d="M18 14a2 2 0 1 0 4 0" />
                <circle cx="12" cy="5" r="1.5" />
              </svg>
            </div>
            <div>
              <span className="font-serif text-lg font-semibold tracking-tight">
                LegalAI
              </span>
              <span className="hidden sm:inline text-muted-foreground text-sm ml-2">
                Darbo teisė
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-5 text-center">
              <h1 className="font-serif text-xl font-semibold">Prisijungti</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Prisijunkite, kad galėtumėte naudotis konsultacijomis
              </p>
            </div>

            <div className="px-6 pb-6 space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              {/* Google Sign-In */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={loadingGoogle}
                className="w-full h-11 gap-2"
                variant="default"
              >
                {loadingGoogle ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Prisijungti su Google
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    arba
                  </span>
                </div>
              </div>

              {/* Magic Link */}
              {magicLinkSent ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-green-600 dark:text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="font-medium text-sm">Nuoroda išsiųsta!</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Patikrinkite savo el. paštą ir paspauskite nuorodą
                  </p>
                  <button
                    onClick={() => setMagicLinkSent(false)}
                    className="text-xs text-primary hover:underline mt-3"
                  >
                    Bandyti kitą adresą
                  </button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jusu@email.lt"
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={loadingMagicLink || !email.trim()}
                    variant="outline"
                    className="w-full h-11"
                  >
                    {loadingMagicLink ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-foreground border-t-transparent"></div>
                    ) : (
                      'Siųsti prisijungimo nuorodą'
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground/60 mt-6">
            Prisijungdami sutinkate su naudojimosi sąlygomis
          </p>
        </div>
      </main>
    </div>
  );
}
