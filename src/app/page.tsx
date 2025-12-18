'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ROLES = [
  { id: 'employer', label: 'Darbdavys', description: 'Vadovauju įmonei arba esu atsakingas už darbuotojus' },
  { id: 'employee', label: 'Darbuotojas', description: 'Dirbu pagal darbo sutartį' },
  { id: 'hr', label: 'HR specialistas', description: 'Dirbu personalo srityje' },
  { id: 'other', label: 'Kita', description: 'Studentas, teisininkas ar kitas' },
];

const COMPANY_SIZES = [
  { id: '<10', label: 'Iki 10', description: 'Mikro įmonė' },
  { id: '10-50', label: '10-50', description: 'Maža įmonė' },
  { id: '50-250', label: '50-250', description: 'Vidutinė įmonė' },
  { id: '250+', label: '250+', description: 'Didelė įmonė' },
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

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    userRole: '',
    companySize: '',
    topic: '',
  });

  const handleSelect = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Save and redirect
      localStorage.setItem('legalai-context', JSON.stringify(data));
      router.push('/chat');
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    if (step === 1) return !!data.userRole;
    if (step === 2) return !!data.companySize;
    if (step === 3) return !!data.topic;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚖️</span>
            <span className="font-semibold text-lg">Darbo teisės asistentas</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero - only on step 1 */}
        {step === 1 && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              Lietuvos darbo teisės konsultacijos
            </h1>
            <p className="text-slate-600 max-w-xl mx-auto">
              Gaukite atsakymus paremtus Darbo kodeksu ir teismų praktika
            </p>
          </div>
        )}

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                s <= step ? 'bg-slate-900' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Role */}
        {step === 1 && (
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Kas jūs esate?</CardTitle>
              <CardDescription>Tai padės pateikti aktualesnį atsakymą</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleSelect('userRole', role.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    data.userRole === role.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium">{role.label}</div>
                  <div className="text-sm text-slate-500">{role.description}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Company Size */}
        {step === 2 && (
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Įmonės dydis</CardTitle>
              <CardDescription>Kai kurios taisyklės priklauso nuo darbuotojų skaičiaus</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {COMPANY_SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => handleSelect('companySize', size.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      data.companySize === size.id
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium">{size.label}</div>
                    <div className="text-sm text-slate-500">{size.description}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Topic */}
        {step === 3 && (
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Kokia tema domina?</CardTitle>
              <CardDescription>Galėsite klausti bet kokį klausimą pokalbio metu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleSelect('topic', topic.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      data.topic === topic.id
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">{topic.icon}</span>
                    <span className="font-medium">{topic.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-center gap-3 mt-6 max-w-xl mx-auto">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} className="px-8">
              Atgal
            </Button>
          )}
          <Button onClick={handleNext} disabled={!canProceed()} className="px-8">
            {step === 3 ? 'Pradėti pokalbį' : 'Toliau'}
          </Button>
        </div>

        {/* Features - only on step 1 */}
        {step === 1 && (
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-16">
            <div className="text-center">
              <div className="text-2xl mb-2">📚</div>
              <div className="font-medium text-sm">Darbo kodeksas</div>
              <div className="text-xs text-slate-500">264 straipsniai</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⚖️</div>
              <div className="font-medium text-sm">LAT praktika</div>
              <div className="text-xs text-slate-500">2015-2025 sprendimai</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🔒</div>
              <div className="font-medium text-sm">Konfidencialumas</div>
              <div className="text-xs text-slate-500">Pokalbiai nesaugomi</div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-center text-xs text-slate-400 mt-12 max-w-md mx-auto">
          Ši sistema teikia tik informacinio pobūdžio konsultacijas.
          Sudėtingesniais atvejais kreipkitės į teisininką.
        </p>
      </main>
    </div>
  );
}
