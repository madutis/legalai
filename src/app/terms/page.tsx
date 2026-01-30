import { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Paslaugų teikimo sąlygos | LegalAI',
  description: 'LegalAI paslaugų teikimo sąlygos ir naudojimosi taisyklės.',
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

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="text-sm text-foreground/90">{children}</div>
      </div>
    </div>
  );
}

export default function TermsPage() {
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
              Paslaugų teikimo sąlygos
            </h1>
            <p className="text-muted-foreground text-sm">
              Paskutinis atnaujinimas: 2026 m. sausio 28 d.
            </p>
          </header>

          {/* Section 1 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">1. Bendrosios nuostatos</h2>

            <TldrBox>
              Mes esame Imum, UAB iš Vilniaus. LegalAI yra AI įrankis apie Lietuvos darbo teisę. Naudodamiesi sutinkate su šiomis sąlygomis.
            </TldrBox>

            <h3 className="font-medium text-base mb-2 mt-4">1.1. Paslaugos teikėjas</h3>
            <div className="text-sm text-foreground/80 space-y-1 ml-4">
              <p><strong>Imum, UAB</strong></p>
              <p>Įmonės kodas: 305646914</p>
              <p>PVM kodas: LT100013542617</p>
              <p>Adresas: S. Konarskio g. 2-29, LT-03122 Vilnius</p>
              <p>El. paštas: <a href="mailto:labas@legalai.lt" className="text-primary hover:underline">labas@legalai.lt</a></p>
            </div>

            <h3 className="font-medium text-base mb-2 mt-4">1.2. Paslaugos aprašymas</h3>
            <p className="text-sm text-foreground/80 ml-4">
              LegalAI yra dirbtinio intelekto pagrindu veikiantis informacinis įrankis, teikiantis informaciją apie Lietuvos darbo teisę, darbo saugą ir susijusius klausimus.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">1.3. Sutikimas su sąlygomis</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Naudodamiesi LegalAI paslaugomis, sutinkate su šiomis sąlygomis. Jei nesutinkate, prašome nesinaudoti paslauga.
            </p>
          </section>

          {/* Section 2 - IMPORTANT */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4 text-destructive">
              2. SVARBUS ĮSPĖJIMAS: TAI NĖRA TEISINĖ KONSULTACIJA
            </h2>

            <WarningBox>
              <strong>LegalAI teikia tik informacinio pobūdžio turinį.</strong> Tai NĖRA ir NEGALI būti laikoma teisine konsultacija, teisine išvada ar profesionalia teisine pagalba. Prieš priimdami sprendimus, konsultuokitės su kvalifikuotu teisininku.
            </WarningBox>

            <h3 className="font-medium text-base mb-2 mt-4">2.1. Informacinis pobūdis</h3>
            <p className="text-sm text-foreground/80 ml-4">
              LegalAI teikia tik informacinio pobūdžio turinį. Tai NĖRA ir NEGALI būti laikoma teisine konsultacija, teisine išvada ar profesionalia teisine pagalba.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">2.2. AI ribotumas</h3>
            <p className="text-sm text-foreground/80 ml-4 mb-2">LegalAI naudoja dirbtinį intelektą, kuris:</p>
            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-1">
              <li>Gali pateikti netikslią, neišsamią ar pasenusią informaciją</li>
              <li>Gali neteisingai interpretuoti teisės aktus</li>
              <li>Negali įvertinti visų konkrečios situacijos aplinkybių</li>
              <li>Nėra licencijuotas teisininkas ir negali atstovauti teisiniuose procesuose</li>
            </ul>

            <h3 className="font-medium text-base mb-2 mt-4">2.3. Rekomendacija</h3>
            <p className="text-sm text-foreground/80 ml-4 font-medium">
              Prieš priimdami bet kokius sprendimus, susijusius su darbo teise, konsultuokitės su kvalifikuotu teisininku arba atitinkama valstybės institucija (VDI, Sodra ir kt.).
            </p>
          </section>

          {/* Section 3 - Liability */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">
              3. Atsakomybės ribojimas ir žalos atlyginimas
            </h2>

            <TldrBox>
              Mes neatsiskome už jokius nuostolius, kylančius dėl LegalAI naudojimo. Jūs prisiimate visą riziką ir sutinkate atlyginti mums žalą, jei kas nors pareikštų pretenzijas dėl jūsų naudojimosi paslauga.
            </TldrBox>

            <h3 className="font-medium text-base mb-2 mt-4">3.1. Atsakomybės ribojimas</h3>
            <p className="text-sm text-foreground/80 ml-4 mb-2 uppercase font-medium">
              Maksimalia įstatymų leidžiama apimtimi:
            </p>

            <p className="text-sm text-foreground/80 ml-4 mb-2">
              a) Imum, UAB <strong>neatsako</strong> už jokius tiesioginius, netiesioginius, atsitiktinius, pasekminius ar baudinius nuostolius, įskaitant, bet neapsiribojant:
            </p>
            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-1">
              <li>Finansinius nuostolius</li>
              <li>Prarastą pelną</li>
              <li>Žalą reputacijai</li>
              <li>Baudas ir sankcijas</li>
              <li>Teisines išlaidas</li>
            </ul>

            <p className="text-sm text-foreground/80 ml-4 mb-2 mt-3">
              b) Imum, UAB <strong>neatsako</strong> už:
            </p>
            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-1">
              <li>Informacijos tikslumą, išsamumą ar aktualumą</li>
              <li>Sprendimus, priimtus remiantis LegalAI pateikta informacija</li>
              <li>Pasekmes, kylančias dėl paslaugos naudojimo ar negalėjimo naudotis</li>
              <li>Trečiųjų šalių veiksmus ar neveikimą</li>
            </ul>

            <p className="text-sm text-foreground/80 ml-4 mt-3">
              c) <strong>Maksimali atsakomybė</strong>, jei tokia būtų nustatyta, ribojama suma, kurią sumokėjote už paslaugą per paskutinius 12 mėnesių.
            </p>

            <h3 className="font-medium text-base mb-2 mt-6">3.2. Žalos atlyginimas (indemnifikacija)</h3>
            <p className="text-sm text-foreground/80 ml-4 mb-2">
              <strong>Jūs sutinkate atlyginti žalą, ginti ir apsaugoti</strong> Imum, UAB, jos vadovus, darbuotojus, partnerius ir atstovus nuo bet kokių:
            </p>
            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-1">
              <li>Pretenzijų, ieškinių ir reikalavimų</li>
              <li>Nuostolių, baudų ir sankcijų</li>
              <li>Išlaidų, įskaitant teisines išlaidas</li>
            </ul>
            <p className="text-sm text-foreground/80 ml-4 mt-2">kylančių dėl arba susijusių su:</p>
            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-1">
              <li>Jūsų naudojimusi LegalAI paslauga</li>
              <li>Sprendimų, priimtų remiantis LegalAI informacija</li>
              <li>Šių sąlygų pažeidimo</li>
              <li>Trečiųjų šalių teisių pažeidimo</li>
            </ul>

            <h3 className="font-medium text-base mb-2 mt-6">3.3. Rizikos prisiėmimas</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Naudodamiesi LegalAI, <strong>jūs prisiimate visą riziką</strong>, susijusią su:
            </p>
            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-1 mt-1">
              <li>Pateiktos informacijos tinkamumu jūsų situacijai</li>
              <li>Informacijos tikslumu ir aktualumu</li>
              <li>Sprendimais, priimtais remiantis šia informacija</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">4. Naudojimosi sąlygos</h2>

            <TldrBox>
              Turite būti 18+ metų. Saugokite savo paskyrą. Nenaudokite neteisėtais tikslais.
            </TldrBox>

            <h3 className="font-medium text-base mb-2 mt-4">4.1. Amžiaus reikalavimas</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Paslauga skirta asmenims nuo 18 metų. Registruodamiesi patvirtinate, kad esate pilnametis.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">4.2. Paskyros saugumas</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Jūs atsakote už savo paskyros saugumą ir visus veiksmus, atliktus prisijungus prie jūsų paskyros.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">4.3. Draudžiami veiksmai</h3>
            <p className="text-sm text-foreground/80 ml-4 mb-1">Draudžiama:</p>
            <ul className="text-sm text-foreground/80 ml-8 list-disc space-y-1">
              <li>Naudoti paslaugą neteisėtiems tikslams</li>
              <li>Bandyti pažeisti sistemos saugumą</li>
              <li>Automatizuotai rinkti duomenis (scraping)</li>
              <li>Perparduoti ar perleisti prieigą tretiesiems asmenims</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">5. Prenumerata ir mokėjimai</h2>

            <TldrBox>
              Mokėjimai per Stripe. Prenumerata pratęsiama automatiškai. Pinigai už panaudotą laikotarpį negrąžinami.
            </TldrBox>

            <h3 className="font-medium text-base mb-2 mt-4">5.1. Kainodara</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Paslaugos kainos nurodytos svetainėje. Kainos gali būti keičiamos, apie tai informuojant iš anksto.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">5.2. Mokėjimai</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Mokėjimai apdorojami per Stripe mokėjimų platformą. Mes nesaugome jūsų mokėjimo kortelės duomenų.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">5.3. Grąžinimo politika</h3>
            <p className="text-sm text-foreground/80 ml-4 font-medium">
              Pinigai už panaudotą prenumeratos laikotarpį negrąžinami. Atšaukus prenumeratą, paslauga veiks iki apmokėto laikotarpio pabaigos.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">5.4. Automatinis pratęsimas</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Prenumerata pratęsiama automatiškai. Galite atšaukti bet kuriuo metu paskyros nustatymuose.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">6. Paslaugos prieinamumas</h2>

            <TldrBox>
              Paslauga teikiama &quot;kaip yra&quot; be jokių garantijų. Negarantuojame veikimo laiko (uptime).
            </TldrBox>

            <h3 className="font-medium text-base mb-2 mt-4">6.1. &quot;Kaip yra&quot; principas</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Paslauga teikiama &quot;kaip yra&quot; (as is) ir &quot;kaip prieinama&quot; (as available) principu, <strong>be jokių garantijų</strong>, tiesioginių ar numanomų.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">6.2. Jokio SLA</h3>
            <p className="text-sm text-foreground/80 ml-4">
              <strong>Negarantuojame</strong> jokio paslaugos prieinamumo lygio (uptime). Paslauga gali būti laikinai neprieinama dėl techninių priežasčių, atnaujinimų ar kitų aplinkybių.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">6.3. Pakeitimai</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Pasiliekame teisę bet kuriuo metu keisti, sustabdyti ar nutraukti paslaugą ar jos dalis.
            </p>
          </section>

          {/* Section 7 - Consultation saving */}
          <section id="konsultaciju-issaugojimas" className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">7. Konsultaciju issaugojimas</h2>

            <TldrBox>
              Jusu konsultacijos saugomos tik jei pasirenkate. Galite bet kada istrinti.
            </TldrBox>

            <div className="space-y-3 text-foreground/80 text-sm ml-4">
              <p>
                Prenumeratoriai gali pasirinkti saugoti konsultaciju istorija. Issaugotos konsultacijos prieinamos tik jums ir gali buti istrintos bet kada.
              </p>
              <p>
                Jei nepasirenkate saugoti, konsultacijos duomenys nera issaugomi po sesijos pabaigos.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">8. Intelektine nuosavybe</h2>

            <h3 className="font-medium text-base mb-2 mt-4">8.1. Musu teises</h3>
            <p className="text-sm text-foreground/80 ml-4">
              LegalAI programine iranga, dizainas, prekiu zenklai ir kitas turinys priklauso Imum, UAB arba jos licenciju davejams.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">8.2. Jusu turinys</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Jus islaikote teises i informacija, kuria pateikiate naudodamiesi paslauga.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">9. Paskyros uzdarymas</h2>

            <h3 className="font-medium text-base mb-2 mt-4">9.1. Jusu iniciatyva</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Galite bet kuriuo metu istrinti paskyra paskyros nustatymuose.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">9.2. Musu iniciatyva</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Galime sustabdyti ar panaikinti jusu paskyra, jei pazeidziate sias salygas.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">10. Baigiamosios nuostatos</h2>

            <h3 className="font-medium text-base mb-2 mt-4">10.1. Taikoma teise</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Sioms salygoms taikoma Lietuvos Respublikos teise.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">10.2. Gincu sprendimas</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Gincai sprendziami derybu budu. Nepavykus susitarti, gincai sprendziami Lietuvos Respublikos teismuose.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">10.3. Salygu pakeitimai</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Galime keisti sias salygas. Apie esminius pakeitimus informuosime el. pastu. Tolimesnis naudojimasis paslauga po pakeitimu reiskia sutikima.
            </p>

            <h3 className="font-medium text-base mb-2 mt-4">10.4. Atskyrimas</h3>
            <p className="text-sm text-foreground/80 ml-4">
              Jei kuri nors salyga pripazistama negaliojancia, likusios salygos lieka galioti.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-10">
            <h2 className="font-serif text-xl font-semibold mb-4">11. Kontaktai</h2>
            <div className="text-sm text-foreground/80 ml-4 space-y-1">
              <p><strong>Imum, UAB</strong></p>
              <p>El. paštas: <a href="mailto:labas@legalai.lt" className="text-primary hover:underline">labas@legalai.lt</a></p>
              <p>Adresas: S. Konarskio g. 2-29, LT-03122 Vilnius</p>
            </div>
          </section>

        </article>
      </main>

      <Footer />
    </div>
  );
}
