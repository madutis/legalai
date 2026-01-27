'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_ICONS: Record<string, React.ReactNode> = {
  employer: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
    </svg>
  ),
  employee: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a8.5 8.5 0 0 1 13 0" />
    </svg>
  ),
  hr: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  other: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  ),
};

const ROLES = [
  { id: 'employer', label: 'Darbdavys', description: 'Vadovauju įmonei arba esu atsakingas už darbuotojus' },
  { id: 'employee', label: 'Darbuotojas', description: 'Dirbu pagal darbo sutartį' },
  { id: 'hr', label: 'HR / Buhalteris', description: 'Dirbu personalo srityje arba tvarkau darbo santykius' },
  { id: 'other', label: 'Kita', description: 'Studentas, teisininkas ar kitas' },
];

const COMPANY_SIZES = [
  { id: '<10', label: 'Iki 10', description: 'Mikro įmonė' },
  { id: '10-50', label: '10-50', description: 'Maža įmonė' },
  { id: '50-250', label: '50-250', description: 'Vidutinė įmonė' },
  { id: '250+', label: '250+', description: 'Didelė įmonė' },
];

const TOPIC_ICONS: Record<string, React.ReactNode> = {
  hiring: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  termination: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  leave: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  wages: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  disciplinary: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  material: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <path d="M3 3l18 18" />
    </svg>
  ),
  contracts: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  safety: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  other: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
  { id: 'disciplinary', label: 'Drausminė atsakomybė' },
  { id: 'material', label: 'Materialinė atsakomybė' },
  { id: 'contracts', label: 'Darbo sutartys' },
  { id: 'safety', label: 'Darbo sauga' },
  { id: 'other', label: 'Kitas klausimas' },
];

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    userRole: '',
    companySize: '',
    topic: '',
  });

  // Auth check - redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [authLoading, user, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background texture-paper flex items-center justify-center">
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

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return (
      <div className="min-h-screen bg-background texture-paper flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const handleSelect = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (field === 'userRole' || field === 'companySize') {
      setTimeout(() => setStep((s) => s + 1), 200);
    } else if (field === 'topic') {
      setTimeout(() => {
        localStorage.setItem('legalai-context', JSON.stringify({ ...data, [field]: value }));
        router.push('/chat');
      }, 200);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
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
    <div className="min-h-screen bg-background texture-paper">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
              <span className="font-serif text-lg font-semibold tracking-tight">LegalAI</span>
              <span className="hidden sm:inline text-muted-foreground text-sm ml-2">Darbo teisė</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-4 sm:py-6">
        {/* Hero - only on step 1 */}
        {step === 1 && (
          <div className="text-center mb-6 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-medium mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse"></span>
              AI + teisės ekspertizė
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground mb-2 tracking-tight leading-tight">
              Lietuvos <span className="text-gold">darbo teisės</span> konsultacijos
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Atsakymai paremti Darbo kodeksu, LAT praktika ir Vyriausybės nutarimais
            </p>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex justify-center items-center gap-2 mb-5">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => s < step && setStep(s)}
                disabled={s > step}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  s === step
                    ? 'bg-primary text-primary-foreground scale-110 shadow-md'
                    : s < step
                    ? 'bg-gold/20 text-gold cursor-pointer hover:bg-gold/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? '✓' : s}
              </button>
              {s < 3 && (
                <div className={`w-8 sm:w-12 h-0.5 rounded-full transition-colors duration-500 ${
                  s < step ? 'bg-gold' : 'bg-border'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Role */}
        {step === 1 && (
          <div className="max-w-xl mx-auto animate-fade-up delay-100" style={{ opacity: 0 }}>
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h2 className="font-serif text-lg font-semibold">Kas jūs esate?</h2>
                <p className="text-muted-foreground text-xs mt-0.5">Tai padės pateikti aktualesnį atsakymą</p>
              </div>
              <div className="p-3 space-y-2">
                {ROLES.map((role, i) => (
                  <button
                    key={role.id}
                    onClick={() => handleSelect('userRole', role.id)}
                    className={`w-full px-3 py-2.5 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 group ${
                      data.userRole === role.id
                        ? 'border-gold bg-gold/5 shadow-sm'
                        : 'border-border hover:border-gold/50 hover:bg-muted/50'
                    }`}
                    style={{ animationDelay: `${150 + i * 50}ms` }}
                  >
                    <div className={`group-hover:scale-110 transition-transform ${data.userRole === role.id ? 'text-gold' : 'text-muted-foreground'}`}>
                      {ROLE_ICONS[role.id]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground">{role.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{role.description}</div>
                    </div>
                    {data.userRole === role.id && (
                      <div className="w-5 h-5 rounded-full bg-gold flex items-center justify-center animate-scale-in flex-shrink-0">
                        <svg className="w-3 h-3 text-gold-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Company Size */}
        {step === 2 && (
          <div className="max-w-xl mx-auto animate-fade-up" style={{ opacity: 0 }}>
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h2 className="font-serif text-lg font-semibold">Įmonės dydis</h2>
                <p className="text-muted-foreground text-xs mt-0.5">Kai kurios taisyklės priklauso nuo darbuotojų skaičiaus</p>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  {COMPANY_SIZES.map((size, i) => (
                    <button
                      key={size.id}
                      onClick={() => handleSelect('companySize', size.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                        data.companySize === size.id
                          ? 'border-gold bg-gold/5 shadow-sm'
                          : 'border-border hover:border-gold/50 hover:bg-muted/50'
                      }`}
                      style={{ animationDelay: `${100 + i * 50}ms` }}
                    >
                      <div className="font-serif text-lg font-semibold text-foreground">{size.label}</div>
                      <div className="text-xs text-muted-foreground">{size.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Topic */}
        {step === 3 && (
          <div className="max-w-xl mx-auto animate-fade-up" style={{ opacity: 0 }}>
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h2 className="font-serif text-lg font-semibold">Kokia tema domina?</h2>
                <p className="text-muted-foreground text-xs mt-0.5">Galėsite klausti bet kokį klausimą pokalbio metu</p>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TOPICS.map((topic, i) => (
                    <button
                      key={topic.id}
                      onClick={() => handleSelect('topic', topic.id)}
                      className={`p-2.5 rounded-lg border-2 text-center transition-all duration-200 group ${
                        data.topic === topic.id
                          ? 'border-gold bg-gold/5 shadow-sm'
                          : 'border-border hover:border-gold/50 hover:bg-muted/50'
                      }`}
                      style={{ animationDelay: `${100 + i * 30}ms` }}
                    >
                      <div className={`mb-1 flex justify-center group-hover:scale-110 transition-transform ${data.topic === topic.id ? 'text-gold' : 'text-muted-foreground'}`}>
                        {TOPIC_ICONS[topic.id]}
                      </div>
                      <span className="font-medium text-xs block leading-snug">{topic.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-center gap-2 mt-5 max-w-xl mx-auto">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              size="sm"
              className="px-4 rounded-lg border hover:bg-muted transition-colors"
            >
              ← Atgal
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            size="sm"
            className="px-6 rounded-lg bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
          >
            {step === 3 ? 'Pradėti pokalbį →' : 'Toliau →'}
          </Button>
        </div>

        {/* Features - only on step 1 */}
        {step === 1 && (
          <div className="mt-10 animate-fade-up delay-300" style={{ opacity: 0 }}>
            <div className="divider-elegant text-muted-foreground text-xs mb-6">
              <span>Duomenų šaltiniai</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {[
                {
                  title: 'Darbo kodeksas',
                  desc: '264 straipsniai',
                  accent: 'from-blue-500/10 to-blue-600/5',
                  iconColor: 'text-blue-600 dark:text-blue-400',
                  icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  ),
                },
                {
                  title: 'LAT praktika',
                  desc: '58 nutartys',
                  accent: 'from-gold/10 to-amber-600/5',
                  iconColor: 'text-gold',
                  icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20" />
                      <path d="M2 6h20" />
                      <path d="M4 6l2 8h-4l2-8" />
                      <path d="M20 6l2 8h-4l2-8" />
                    </svg>
                  ),
                },
                {
                  title: 'VDI šaltiniai',
                  desc: '260 DUK + dokumentai',
                  accent: 'from-purple-500/10 to-purple-600/5',
                  iconColor: 'text-purple-600 dark:text-purple-400',
                  icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      <path d="M8 9h8M8 13h6" />
                    </svg>
                  ),
                },
                {
                  title: 'LRV nutarimai',
                  desc: '12 nutarimų',
                  accent: 'from-emerald-500/10 to-emerald-600/5',
                  iconColor: 'text-emerald-600 dark:text-emerald-400',
                  icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                      <path d="M9 15 11 17 15 13" />
                    </svg>
                  ),
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`text-center p-3 rounded-xl bg-gradient-to-br ${item.accent} border border-border/50 hover:border-border transition-colors`}
                  style={{ animationDelay: `${400 + i * 100}ms` }}
                >
                  <div className={`mb-2 flex justify-center ${item.iconColor}`}>
                    {item.icon}
                  </div>
                  <div className="font-serif font-semibold text-foreground text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
            <p className="text-center text-muted-foreground text-xs mt-5 flex items-center justify-center gap-1.5">
              <svg className="w-3 h-3 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Pokalbiai nesaugomi
            </p>
            <p className="text-center text-muted-foreground text-xs mt-2">
              Naudojami <a href="https://data.gov.lt/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Lietuvos Atvirų Duomenų Portalo</a> duomenys
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted-foreground/60 mt-8 max-w-md mx-auto leading-relaxed">
          Informacinio pobūdžio konsultacijos. Sudėtingais atvejais kreipkitės į teisininką.
        </p>
      </main>
    </div>
  );
}
