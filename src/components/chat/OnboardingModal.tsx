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

const ROLES = [
  { id: 'employer', label: 'Darbdavys', icon: '🏢' },
  { id: 'employee', label: 'Darbuotojas', icon: '👤' },
  { id: 'hr', label: 'HR specialistas', icon: '📋' },
  { id: 'other', label: 'Kita', icon: '❓' },
];

const COMPANY_SIZES = [
  { id: '<10', label: 'Iki 10 darbuotojų' },
  { id: '10-50', label: '10-50 darbuotojų' },
  { id: '50-250', label: '50-250 darbuotojų' },
  { id: '250+', label: 'Daugiau nei 250' },
];

const TOPICS = [
  { id: 'hiring', label: 'Įdarbinimas', icon: '📝' },
  { id: 'termination', label: 'Atleidimas', icon: '🚪' },
  { id: 'leave', label: 'Atostogos', icon: '🏖️' },
  { id: 'wages', label: 'Darbo užmokestis', icon: '💰' },
  { id: 'council', label: 'Darbo taryba', icon: '🤝' },
  { id: 'contracts', label: 'Darbo sutartys', icon: '📋' },
  { id: 'other', label: 'Kitas klausimas', icon: '💬' },
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-6">
        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Role */}
        {step === 1 && (
          <>
            <h2 className="text-xl font-semibold mb-2">Kas jūs esate?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Tai padės pateikti jums aktualesnį atsakymą
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleSelect('userRole', role.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    data.userRole === role.id
                      ? 'border-primary bg-muted'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{role.icon}</span>
                  <span className="font-medium">{role.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Company Size */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold mb-2">Įmonės dydis</h2>
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
                      ? 'border-primary bg-muted'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <span className="font-medium">{size.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 3: Topic */}
        {step === 3 && (
          <>
            <h2 className="text-xl font-semibold mb-2">Kokia tema domina?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Galėsite klausti bet kokį klausimą pokalbio metu
            </p>
            <div className="grid grid-cols-2 gap-3">
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleSelect('topic', topic.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    data.topic === topic.id
                      ? 'border-primary bg-muted'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{topic.icon}</span>
                  <span className="font-medium">{topic.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Atgal
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1"
          >
            {step === 3 ? 'Pradėti pokalbį' : 'Toliau'}
          </Button>
        </div>
      </div>
    </div>
  );
}
