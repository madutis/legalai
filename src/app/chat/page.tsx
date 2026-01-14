'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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
  council: 'Darbo taryba',
  contracts: 'Darbo sutartys',
  other: 'Kitas klausimas',
};

export default function ChatPage() {
  const router = useRouter();
  const [context, setContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('legalai-context');
    if (saved) {
      try {
        setContext(JSON.parse(saved));
      } catch {
        router.push('/');
      }
    } else {
      router.push('/');
    }
    setLoading(false);
  }, [router]);

  const handleNewConsultation = () => {
    localStorage.removeItem('legalai-context');
    router.push('/');
  };

  if (loading || !context) {
    return (
      <div className="h-[100svh] flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[100svh] flex flex-col bg-muted/50">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="text-xl flex-shrink-0">⚖️</span>
            <span className="font-semibold truncate text-sm sm:text-base">Darbo teisės asistentas</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleNewConsultation} className="flex-shrink-0 text-xs sm:text-sm">
              <span className="hidden sm:inline">Nauja konsultacija</span>
              <span className="sm:hidden">Nauja</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Context Summary - hidden on very small screens, scrollable on medium */}
      <div className="bg-muted border-b px-3 sm:px-4 py-2 flex-shrink-0 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-4 text-xs sm:text-sm min-w-max sm:min-w-0">
          <span className="text-muted-foreground hidden sm:inline">Kontekstas:</span>
          <span className="bg-background px-2 py-1 rounded text-foreground whitespace-nowrap">
            {ROLE_LABELS[context.userRole] || context.userRole}
          </span>
          <span className="bg-background px-2 py-1 rounded text-foreground whitespace-nowrap">
            {context.companySize} darb.
          </span>
          <span className="bg-background px-2 py-1 rounded text-foreground whitespace-nowrap">
            {TOPIC_LABELS[context.topic] || context.topic}
          </span>
          <button
            onClick={handleNewConsultation}
            className="text-muted-foreground hover:text-foreground ml-auto text-xs whitespace-nowrap"
          >
            Keisti
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
