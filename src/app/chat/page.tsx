'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Button } from '@/components/ui/button';
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
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <span className="font-semibold">Darbo teisės asistentas</span>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleNewConsultation}>
              Nauja konsultacija
            </Button>
          </div>
        </div>
      </header>

      {/* Context Summary */}
      <div className="bg-slate-100 border-b px-4 py-2 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-4 text-sm">
          <span className="text-slate-500">Kontekstas:</span>
          <span className="bg-white px-2 py-1 rounded text-slate-700">
            {ROLE_LABELS[context.userRole] || context.userRole}
          </span>
          <span className="bg-white px-2 py-1 rounded text-slate-700">
            {context.companySize} darbuotojų
          </span>
          <span className="bg-white px-2 py-1 rounded text-slate-700">
            {TOPIC_LABELS[context.topic] || context.topic}
          </span>
          <button
            onClick={handleNewConsultation}
            className="text-slate-400 hover:text-slate-600 ml-auto text-xs"
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
