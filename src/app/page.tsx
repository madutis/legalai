import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

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
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚖️</span>
            <span className="font-semibold text-lg">Darbo teisės asistentas</span>
          </div>
          <Link href="/chat">
            <Button variant="outline">Pradėti pokalbį</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Lietuvos darbo teisės konsultacijos
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Gaukite atsakymus į darbo teisės klausimus, paremtus Lietuvos Respublikos
            darbo kodeksu ir teismų praktika.
          </p>
        </div>

        {/* Topic Selection */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Apie ką norėtumėte pasikonsultuoti?</CardTitle>
            <CardDescription>
              Pasirinkite temą arba tiesiog pradėkite pokalbį
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TOPICS.map((topic) => (
                <Link key={topic.id} href={`/chat?topic=${topic.id}`}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 px-4 flex flex-col items-center gap-2 hover:bg-slate-50 hover:border-slate-400"
                  >
                    <span className="text-2xl">{topic.icon}</span>
                    <span className="text-sm">{topic.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
          <div className="text-center p-6">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="font-semibold mb-2">Darbo kodeksas</h3>
            <p className="text-sm text-slate-600">
              Atsakymai paremti aktualiu LR Darbo kodeksu
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-3xl mb-3">⚖️</div>
            <h3 className="font-semibold mb-2">Teismų praktika</h3>
            <p className="text-sm text-slate-600">
              Atsižvelgiama į LAT sprendimus ir precedentus
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold mb-2">Konfidencialumas</h3>
            <p className="text-sm text-slate-600">
              Jūsų pokalbiai nėra saugomi ar naudojami
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-sm text-slate-500 mt-12 max-w-xl mx-auto">
          ⚠️ Ši sistema teikia tik informacinio pobūdžio konsultacijas.
          Sudėtingesniais atvejais rekomenduojame kreiptis į kvalifikuotą teisininką.
        </p>
      </main>
    </div>
  );
}
