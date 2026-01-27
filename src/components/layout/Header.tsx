'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

interface HeaderProps {
  children?: ReactNode;
  showAuth?: boolean; // Show avatar (logged in) or sign-in link (logged out)
}

export function Header({ children, showAuth = false }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-md flex-shrink-0 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        {/* Logo */}
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

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {children}
          {showAuth && (
            user ? (
              <Link
                href="/account"
                className="relative w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-sm font-semibold text-primary border-2 border-transparent hover:border-gold/50 transition-all duration-200 hover:scale-105 hover:shadow-sm group"
                title={user.email || 'Paskyra'}
              >
                <span className="font-serif">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </span>
                <span className="absolute inset-0 rounded-full bg-gold/0 group-hover:bg-gold/5 transition-colors duration-200" />
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="flex-shrink-0 text-xs sm:text-sm rounded-lg border border-border hover:bg-muted transition-colors px-3 py-1.5 sm:py-2"
              >
                Prisijungti
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
