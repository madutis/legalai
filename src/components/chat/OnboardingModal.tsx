'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface OnboardingData {
  userRole: string;
  companySize: string;
  topic: string;
}

interface OnboardingModalProps {
  onComplete: (data: OnboardingData) => void;
  initialTopic?: string;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  employer: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
    </svg>
  ),
  employee: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a8.5 8.5 0 0 1 13 0" />
    </svg>
  ),
  hr: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  other: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  ),
};

const ROLES = [
  { id: 'employer', label: 'Darbdavys' },
  { id: 'employee', label: 'Darbuotojas' },
  { id: 'hr', label: 'HR specialistas' },
  { id: 'other', label: 'Kita' },
];

const COMPANY_SIZES = [
  { id: '<10', label: 'Iki 10 darbuotojų' },
  { id: '10-50', label: '10-50 darbuotojų' },
  { id: '50-250', label: '50-250 darbuotojų' },
  { id: '250+', label: 'Daugiau nei 250' },
];

const TOPIC_ICONS: Record<string, React.ReactNode> = {
  hiring: (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  termination: (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  leave: (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  wages: (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  council: (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  contracts: (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  other: (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h6" />
    </svg>
  ),
};

const TOPICS = [
  { id: 'hiring', label: 'Įdarbinimas' },
  { id: 'termination', label: 'Atleidimas' },
  { id: 'leave', label: 'Atostogos' },
  { id: 'wages', label: 'Darbo užmokestis' },
  { id: 'council', label: 'Darbo taryba' },
  { id: 'contracts', label: 'Darbo sutartys' },
  { id: 'other', label: 'Kitas klausimas' },
];

export function OnboardingModal({ onComplete, initialTopic }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    userRole: '',
    companySize: '',
    topic: initialTopic || '',
  });

  const handleSelect = (field: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete(data);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!data.userRole;
    if (step === 2) return !!data.companySize;
    if (step === 3) return !!data.topic;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 border border-border animate-scale-in">
        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-gold' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Role */}
        {step === 1 && (
          <>
            <h2 className="font-serif text-xl font-semibold mb-2">Kas jūs esate?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Tai padės pateikti jums aktualesnį atsakymą
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleSelect('userRole', role.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all group ${
                    data.userRole === role.id
                      ? 'border-gold bg-gold/5 shadow-md'
                      : 'border-border hover:border-gold/50 hover:bg-muted/50'
                  }`}
                >
                  <div className={`mb-2 group-hover:scale-110 transition-transform ${data.userRole === role.id ? 'text-gold' : 'text-muted-foreground'}`}>
                    {ROLE_ICONS[role.id]}
                  </div>
                  <span className="font-medium">{role.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Company Size */}
        {step === 2 && (
          <>
            <h2 className="font-serif text-xl font-semibold mb-2">Įmonės dydis</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Kai kurios taisyklės priklauso nuo darbuotojų skaičiaus
            </p>
            <div className="space-y-2">
              {COMPANY_SIZES.map((size) => (
                <button
                  key={size.id}
                  onClick={() => handleSelect('companySize', size.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    data.companySize === size.id
                      ? 'border-gold bg-gold/5 shadow-md'
                      : 'border-border hover:border-gold/50 hover:bg-muted/50'
                  }`}
                >
                  <span className="font-medium">{size.label}</span>
                  {data.companySize === size.id && (
                    <span className="float-right text-gold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 3: Topic */}
        {step === 3 && (
          <>
            <h2 className="font-serif text-xl font-semibold mb-2">Kokia tema domina?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Galėsite klausti bet kokį klausimą pokalbio metu
            </p>
            <div className="grid grid-cols-2 gap-3">
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleSelect('topic', topic.id)}
                  className={`p-4 rounded-xl border-2 text-center transition-all group ${
                    data.topic === topic.id
                      ? 'border-gold bg-gold/5 shadow-md'
                      : 'border-border hover:border-gold/50 hover:bg-muted/50'
                  }`}
                >
                  <div className={`mb-2 flex justify-center group-hover:scale-110 transition-transform ${data.topic === topic.id ? 'text-gold' : 'text-muted-foreground'}`}>
                    {TOPIC_ICONS[topic.id]}
                  </div>
                  <span className="font-medium text-sm">{topic.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1 rounded-xl">
              ← Atgal
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
          >
            {step === 3 ? 'Pradėti pokalbį →' : 'Toliau →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
