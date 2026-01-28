import { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Privatumo politika | LegalAI',
  description: 'LegalAI privatumo politika ir duomenų tvarkymo sąlygos pagal BDAR.',
};

function TldrBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 p-4 bg-gold/10 border border-gold/30 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-sm">
          <span className="font-semibold text-gold">Trumpai:</span>
          <span className="text-foreground/80 ml-1">{children}</span>
        </div>
      </div>
    </div>
  );
}

function GoodNewsBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-sm text-foreground/90">{children}</div>
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
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
            <span className="font-serif font-semibold">LegalAI</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Grįžti
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-8 sm:py-12">
        <article className="max-w-3xl mx-auto px-4">
          <header className="mb-8 pb-6 border-b border-border">
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold mb-2">
              Privatumo politika
            </h1>
            <p className="text-muted-foreground text-sm">
              Paskutinis atnaujinimas: 2026 m. sausio 28 d.
            </p>
          </header>

          {/* Section 1 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">1. Duomenų valdytojas</h2>

            <div className="text-sm text-foreground/80 space-y-1 ml-4">
              <p><strong>Imum, UAB</strong></p>
              <p>Įmonės kodas: 305646914</p>
              <p>PVM kodas: LT100013542617</p>
              <p>Adresas: S. Konarskio g. 2-29, LT-03122 Vilnius</p>
              <p>El. paštas: <a href="mailto:labas@legalai.lt" className="text-primary hover:underline">labas@legalai.lt</a></p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">2. Kokius duomenis renkame</h2>

            <TldrBox>
              Renkame tik būtinus duomenis: jūsų vardą ir el. paštą iš Google, bei įmonės profilį. Pokalbių su AI nesaugome.
            </TldrBox>

            <h3 className="font-medium text-base mb-2 mt-4">2.1. Paskyros duomenys</h3>
            <p className="text-sm text-foreground/80 ml-4 mb-2">
              Registruojantis per Google paskyrą, gauname:
            </p>
            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-1">
              <li>Vardą ir pavardę</li>
              <li>El. pašto adresą</li>
              <li>Profilio nuotrauką (jei vieša)</li>
            </ul>

            <h3 className="font-medium text-base mb-2 mt-4">2.2. Profilio duomenys</h3>
            <p className="text-sm text-foreground/80 ml-4 mb-2">
              Naudojantis paslauga, renkame:
            </p>
            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-1">
              <li>Jūsų pareigų tipą (buhalteris, vadovas ir kt.)</li>
              <li>Įmonės dydį (darbuotojų skaičių)</li>
            </ul>

            <h3 className="font-medium text-base mb-2 mt-4">2.3. Techniniai duomenys</h3>
            <p className="text-sm text-foreground/80 ml-4 mb-2">
              Automatiškai renkami:
            </p>
            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-1">
              <li>IP adresas</li>
              <li>Naršyklės tipas</li>
              <li>Apsilankymo data ir laikas</li>
              <li>Peržiūrėti puslapiai</li>
            </ul>

            <h3 className="font-medium text-base mb-2 mt-4">2.4. Ko nerenkame</h3>
            <GoodNewsBox>
              <strong>Pokalbių istorijos nesaugome.</strong> Jūsų konsultacijos su AI asistentu nėra išsaugomos mūsų serveriuose. Kiekvienas pokalbis pradedamas iš naujo.
            </GoodNewsBox>
          </section>

          {/* Section 3 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">3. Duomenų tvarkymo tikslai ir teisinis pagrindas</h2>

            <TldrBox>
              Jūsų duomenis naudojame tik tam, kad galėtumėte naudotis paslauga ir mes galėtume ją tobulinti.
            </TldrBox>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium border-b border-border">Tikslas</th>
                    <th className="text-left px-4 py-2 font-medium border-b border-border">Teisinis pagrindas</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Paskyros sukūrimas ir valdymas</td>
                    <td className="px-4 py-2 border-b border-border">Sutarties vykdymas (BDAR 6 str. 1 d. b p.)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Paslaugos personalizavimas</td>
                    <td className="px-4 py-2 border-b border-border">Sutarties vykdymas</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Mokėjimų apdorojimas</td>
                    <td className="px-4 py-2 border-b border-border">Sutarties vykdymas</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Svetainės analizė ir tobulinimas</td>
                    <td className="px-4 py-2">Teisėtas interesas (BDAR 6 str. 1 d. f p.)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">4. Duomenų tvarkytojai (trečiosios šalys)</h2>

            <TldrBox>
              Naudojame Google (autentifikacija, AI, analitika), Stripe (mokėjimai). Visi partneriai atitinka BDAR reikalavimus.
            </TldrBox>

            <p className="text-sm text-foreground/80 ml-4 mb-4">
              Jūsų duomenis tvarko šie paslaugų teikėjai:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium border-b border-border">Tvarkytojas</th>
                    <th className="text-left px-4 py-2 font-medium border-b border-border">Paskirtis</th>
                    <th className="text-left px-4 py-2 font-medium border-b border-border">Vieta</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Google Firebase</td>
                    <td className="px-4 py-2 border-b border-border">Autentifikacija, duomenų bazė</td>
                    <td className="px-4 py-2 border-b border-border">ES/JAV*</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Google Gemini</td>
                    <td className="px-4 py-2 border-b border-border">AI konsultacijų teikimas</td>
                    <td className="px-4 py-2 border-b border-border">ES/JAV*</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Google Analytics</td>
                    <td className="px-4 py-2 border-b border-border">Svetainės analizė</td>
                    <td className="px-4 py-2 border-b border-border">ES/JAV*</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Stripe</td>
                    <td className="px-4 py-2">Mokėjimų apdorojimas</td>
                    <td className="px-4 py-2">ES/JAV*</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground ml-4 mt-3">
              *Duomenų perdavimas į JAV vykdomas pagal ES-JAV duomenų privatumo sistemą (Data Privacy Framework).
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">5. Duomenų saugojimo terminai</h2>

            <TldrBox>
              Ištrynus paskyrą, jūsų duomenys bus ištrinti per 30 dienų. Mokėjimų įrašus privalome saugoti 10 metų.
            </TldrBox>

            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-2 mt-4">
              <li><strong>Aktyvios paskyros duomenys:</strong> saugomi, kol naudojatės paslauga</li>
              <li><strong>Po paskyros ištrynimo:</strong> duomenys ištrinami per 30 dienų</li>
              <li><strong>Mokėjimų įrašai:</strong> saugomi 10 metų pagal buhalterinės apskaitos reikalavimus</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">6. Jūsų teisės</h2>

            <TldrBox>
              Turite teisę prašyti savo duomenų, juos ištaisyti, ištrinti ar perkelti. Galite pateikti skundą Duomenų apsaugos inspekcijai.
            </TldrBox>

            <p className="text-sm text-foreground/80 ml-4 mb-3">
              Pagal BDAR turite teisę:
            </p>
            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-2">
              <li><strong>Susipažinti</strong> su savo duomenimis</li>
              <li><strong>Ištaisyti</strong> netikslius duomenis</li>
              <li><strong>Ištrinti</strong> duomenis (&quot;teisė būti pamirštam&quot;)</li>
              <li><strong>Apriboti</strong> duomenų tvarkymą</li>
              <li><strong>Perkelti</strong> duomenis kitam valdytojui</li>
              <li><strong>Nesutikti</strong> su duomenų tvarkymu</li>
              <li><strong>Pateikti skundą</strong> Valstybinei duomenų apsaugos inspekcijai (<a href="https://ada.lt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ada.lt</a>)</li>
            </ul>

            <p className="text-sm text-foreground/80 ml-4 mt-4">
              Norėdami pasinaudoti šiomis teisėmis, kreipkitės el. paštu <a href="mailto:labas@legalai.lt" className="text-primary hover:underline">labas@legalai.lt</a>.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">7. Slapukai</h2>

            <TldrBox>
              Naudojame tik būtinus slapukus prisijungimui ir Google Analytics statistikai.
            </TldrBox>

            <p className="text-sm text-foreground/80 ml-4 mb-4">
              Naudojame šiuos slapukus:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium border-b border-border">Slapukas</th>
                    <th className="text-left px-4 py-2 font-medium border-b border-border">Tipas</th>
                    <th className="text-left px-4 py-2 font-medium border-b border-border">Paskirtis</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Sesijos slapukai</td>
                    <td className="px-4 py-2 border-b border-border">Būtinieji</td>
                    <td className="px-4 py-2 border-b border-border">Autentifikacija, sesijos palaikymas</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Google Analytics</td>
                    <td className="px-4 py-2">Analitiniai</td>
                    <td className="px-4 py-2">Lankytojų statistika</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-foreground/80 ml-4 mt-4">
              Galite valdyti slapukus savo naršyklės nustatymuose.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">8. Privatumo politikos pakeitimai</h2>

            <p className="text-sm text-foreground/80 ml-4">
              Apie esminius pakeitimus informuosime el. paštu arba pranešimu svetainėje. Tolimesnis naudojimasis paslauga po pakeitimų reiškia sutikimą su atnaujinta politika.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">9. Kontaktai</h2>
            <p className="text-sm text-foreground/80 ml-4 mb-2">
              Kilus klausimų dėl privatumo, kreipkitės:
            </p>
            <div className="text-sm text-foreground/80 ml-4">
              <p><strong>El. paštas:</strong> <a href="mailto:labas@legalai.lt" className="text-primary hover:underline">labas@legalai.lt</a></p>
            </div>
          </section>

        </article>
      </main>

      <Footer />
    </div>
  );
}
