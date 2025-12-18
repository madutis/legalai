'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { OnboardingModal } from '@/components/chat/OnboardingModal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface UserContext {
  userRole: string;
  companySize: string;
  topic: string;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const topicFromUrl = searchParams.get('topic');

  const [context, setContext] = useState<UserContext | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [chatKey, setChatKey] = useState(Date.now());

  // Check for saved context on mount, or use topic from URL
  useEffect(() => {
    const saved = localStorage.getItem('legalai-context');
    if (saved && !topicFromUrl) {
      try {
        const parsed = JSON.parse(saved);
        setContext(parsed);
        setShowOnboarding(false);
      } catch {
        // Invalid saved data, show onboarding
      }
    }
  }, [topicFromUrl]);

  const handleOnboardingComplete = (data: UserContext) => {
    setContext(data);
    setShowOnboarding(false);
    setChatKey(Date.now()); // Reset chat
    localStorage.setItem('legalai-context', JSON.stringify(data));
  };

  const handleNewConsultation = () => {
    setShowOnboarding(true);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          initialTopic={topicFromUrl || undefined}
        />
      )}

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
            <Link href="/">
              <Button variant="ghost" size="sm">Grįžti</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Chat - takes remaining height */}
      <main className="flex-1 overflow-hidden">
        {context && (
          <ChatInterface
            key={chatKey}
            userRole={context.userRole}
            companySize={context.companySize}
            topic={context.topic}
          />
        )}
      </main>
    </div>
  );
}
