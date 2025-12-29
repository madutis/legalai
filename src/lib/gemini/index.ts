import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
  }
  return genAI;
}

// Generate embedding for a query
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// Extract relevant Labor Code article numbers from a query
export async function extractRelevantArticles(query: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Tu esi Lietuvos darbo teisės ekspertas. Vartotojas užduoda klausimą apie darbo teisę.
Nustatyk, kurie Darbo kodekso straipsniai gali būti aktualūs šiam klausimui.

DARBO KODEKSO STRAIPSNIŲ SĄRAŠAS:

I. BENDROSIOS NUOSTATOS (1-20)
1 - Darbo kodekso paskirtis
2 - Darbo santykių teisinis reglamentavimas
3 - Darbo teisės šaltiniai
4 - Darbo teisės principai
5 - Darbo teisės normų aiškinimas
6 - Darbo sutarties šalys
7 - Darbdavys
8 - Darbuotojas
9 - Darbuotojų atstovai
10 - Darbo santykių atsiradimas
11 - Darbuotojo pareigos
12 - Darbdavio pareigos
13 - Darbuotojo teisės
14 - Darbdavio teisės
20 - Senatis darbo ginčuose

II. DARBO SUTARTIS (21-40)
21 - Darbo sutarties samprata
22 - Darbo sutarties turinys
23 - Būtinosios darbo sutarties sąlygos
24 - Papildomos darbo sutarties sąlygos
25 - Susitarimas dėl nekonkuravimo
26 - Darbo sutarties sudarymo tvarka
27 - Darbo sutarties forma
28 - Darbo sutarties registravimas
29 - Dokumentai sudarant darbo sutartį
30 - Leidimas dirbti užsieniečiams
31 - Darbo sutarties sudarymo ribojimai
32 - Darbo sutarties negaliojimas
33 - Darbo sutarties sąlygų keitimas
34 - Perkėlimas į kitą darbą
35 - Nušalinimas nuo darbo
36 - Išbandymas sudarant darbo sutartį
37 - Darbo funkcijų ir pareigų aprašymas
38 - Darbo vieta
39 - Darbo apmokėjimo sąlygos
40 - Darbo laiko norma

III. DARBO SUTARTIES PASIBAIGIMAS (41-60)
41 - Darbo sutarties pasibaigimo pagrindai
42 - Darbo sutarties pasibaigimas nesant šalių valios
43 - Darbo sutarties nutraukimas šalių susitarimu
44 - Darbo sutarties nutraukimas darbuotojo valia (be svarbių priežasčių)
45 - Darbo sutarties nutraukimas dėl darbuotojo prašymo (su svarbiomis priežastimis)
46 - Atleidimo tvarka pagal darbuotojo pareiškimą
47 - Darbuotojo teisė atšaukti pareiškimą
48 - Atsiskaitymas atleidžiant darbuotoją
49 - Dokumentų grąžinimas
50 - Darbo pažymėjimas
51 - Rekomendacija
52 - Darbo sutarties nutraukimo įforminimas
53 - Darbo sutarties nutraukimas dėl darbuotojo mirties
54 - Darbo sutarties nutraukimas dėl darbdavio mirties
55 - Teismo sprendimas dėl darbo sutarties nutraukimo
56 - Neteisėtas atleidimas iš darbo
57 - Darbo sutarties nutraukimas darbdavio iniciatyva be darbuotojo kaltės
58 - Darbo sutarties nutraukimas darbdavio iniciatyva dėl darbuotojo kaltės
59 - Darbuotojo atleidimas už šiurkštų pažeidimą
60 - Darbo sutarties nutraukimas darbdavio valia

IV. DARBO SUTARTIES NUTRAUKIMO APRIBOJIMAI IR GARANTIJOS (61-65)
61 - Darbo sutarties nutraukimo apribojimai (nėščios, vaiko priežiūros atostogos, neįgalieji)
62 - Darbo sutarties nutraukimas darbdavio bankroto atveju
63 - Grupės darbuotojų atleidimas (kolektyvinis atleidimas)
64 - Įspėjimo apie darbo sutarties nutraukimą terminai
65 - Išeitinė išmoka

V. SPECIALIOS DARBO SUTARTYS (66-100)
66 - Specialių darbo sutarčių rūšys
67 - Terminuota darbo sutartis
68 - Terminuotos sutarties pratęsimas
69 - Terminuotos sutarties pasibaigimas
70 - Laikinojo darbo sutartis
71 - Laikinojo darbo agentura
72 - Laikinojo darbuotojo teisės
73 - Pameistrystės darbo sutartis
74 - Projektinio darbo sutartis
75 - Darbo vietos dalijimosi sutartis
76 - Darbo keliems darbdaviams sutartis
77 - Sezoninio darbo sutartis
78 - Nuotolinio darbo sutartis
79 - Nuotolinio darbo sąlygos
80 - Nuotolinio darbo įforminimas
81 - Papildomo darbo sutartis (antraeilės pareigos)
82 - Papildomo darbo apribojimai

VI. DARBO LAIKAS (101-120)
101 - Darbo laiko samprata
102 - Darbo laiko režimas
103 - Darbo laiko norma
104 - Sutrumpintas darbo laikas
105 - Ne visas darbo laikas
106 - Darbo laiko apskaita
107 - Suminė darbo laiko apskaita
108 - Lankstus darbo grafikas
109 - Darbo grafikai
110 - Budėjimas
111 - Maksimalus darbo laikas (48 val./sav.)
112 - Nakties darbas
113 - Nakties darbo apribojimai
114 - Nakties darbuotojų garantijos
115 - Viršvalandinis darbas
116 - Viršvalandžių ribos
117 - Viršvalandžių apmokėjimas
118 - Darbas poilsio ir švenčių dienomis
119 - Darbo laiko apskaitos žiniaraštis
120 - Darbo laiko fiksavimas

VII. POILSIO LAIKAS (121-125)
121 - Poilsio laiko rūšys
122 - Pertrauka pailsėti ir pavalgyti
123 - Specialios pertraukos
124 - Paros poilsis
125 - Savaitės nepertraukiamasis poilsis

VIII. ATOSTOGOS (126-140)
126 - Kasmetinės atostogos (minimali trukmė 20 d.d.)
127 - Pailgintos atostogos
128 - Papildomos atostogos
129 - Kasmetinių atostogų suteikimas
130 - Atostogų grafikas
131 - Tikslinės atostogos (nėštumo, gimdymo, tėvystės, vaiko priežiūros)
132 - Nėštumo ir gimdymo atostogos
133 - Tėvystės atostogos
134 - Vaiko priežiūros atostogos
135 - Atostogų dėl vaiko priežiūros suteikimas
136 - Mokymosi atostogos
137 - Nemokamos atostogos
138 - Kūrybinės atostogos
139 - Atostogų perkėlimas
140 - Atšaukimas iš atostogų

IX. DARBO UŽMOKESTIS (141-150)
141 - Darbo užmokesčio samprata
142 - Minimalusis darbo užmokestis (MMA)
143 - Darbo apmokėjimo sistema
144 - Darbo užmokesčio mokėjimas
145 - Darbo užmokesčio apskaičiavimas
146 - Vidutinis darbo užmokestis
147 - Priemokos, priedai
148 - Premijos
149 - Darbo užmokesčio apsauga
150 - Išskaitos iš darbo užmokesčio

X. MATERIALINĖ ATSAKOMYBĖ (151-160)
151 - Darbuotojo materialinė atsakomybė
152 - Visiškos materialinės atsakomybės atvejai
153 - Materialinės atsakomybės sutartis
154 - Žalos atlyginimo tvarka
155 - Žalos dydžio nustatymas
156 - Darbdavio materialinė atsakomybė
157 - Žalos atlyginimas dėl nelaimingo atsitikimo darbe
158 - Žalos atlyginimas dėl profesinės ligos
159 - Laidojimo pašalpa
160 - Neturtinės žalos atlyginimas

XI. DARBUOTOJŲ ATSTOVAVIMAS (161-180)
161 - Darbuotojų atstovavimo formos
162 - Profesinė sąjunga
163 - Profesinės sąjungos teisės
164 - Profesinės sąjungos narių garantijos
165 - Darbo tarybos sudarymas (įmonėse nuo 20 darbuotojų)
166 - Darbo tarybos kompetencija
167 - Darbo tarybos narių garantijos (patalpos, priemonės, finansavimas)
168 - Darbuotojų atstovų pareigų atlikimo garantijos (60 val./metus)
169 - Darbo tarybos rinkimai
170 - Darbo tarybos sudėtis ir narių skaičius
171 - Darbo tarybos pirmininkas
172 - Narystė darbo taryboje
173 - Darbo tarybos veiklos organizavimas
174 - Darbo tarybos posėdžiai
175 - Darbo tarybos sprendimai
176 - Darbo tarybos veiklos pasibaigimas (reorganizacija, likvidavimas)
177 - Darbuotojų patikėtinis (įmonėse iki 20 darbuotojų)
178 - Darbuotojų atstovų apsauga nuo diskriminacijos
179 - Garantijos atleidimo atveju
180 - Profesinės sąjungos sutikimas atleisti

XII. KOLEKTYVINIAI DARBO SANTYKIAI (181-202)
181 - Kolektyvinių sutarčių rūšys
182 - Nacionalinė kolektyvinė sutartis
183 - Šakos kolektyvinė sutartis
184 - Darbdavio kolektyvinė sutartis
185 - Kolektyvinių derybų pradžia
186 - Kolektyvinių derybų tvarka
187 - Kolektyvinės sutarties turinys
188 - Kolektyvinės sutarties forma
189 - Kolektyvinės sutarties registravimas
190 - Kolektyvinės sutarties galiojimas
191 - Kolektyvinės sutarties pakeitimas
192 - Kolektyvinės sutarties nutraukimas

XIII. INFORMAVIMAS IR KONSULTAVIMAS (203-211)
203 - Informavimo ir konsultavimo pareiga
204 - Informavimo ir konsultavimo turinys
205 - Informavimo tvarka
206 - Konsultavimo tvarka
207 - Europos darbo taryba
208 - Informavimas ir konsultavimas verslo perdavimo atveju
209 - Informavimas grupės atleidimo atveju
210 - Darbuotojų atstovų dalyvavimas juridinio asmens valdyme (valdyba)
211 - Darbuotojų atstovų skyrimo į valdymo organus tvarka

XIV. DARBO GINČAI (212-240)
212 - Darbo ginčų rūšys
213 - Darbo ginčų komisija (DGK)
214 - DGK sudėtis
215 - Kreipimasis į DGK
216 - Darbo ginčo nagrinėjimas DGK
217 - DGK sprendimas
218 - DGK sprendimo apskundimas teismui
219 - Individualūs darbo ginčai teisme
220 - Kolektyviniai darbo ginčai
221 - Taikinimo procedūra
222 - Darbo arbitražas
223 - Streikas
224 - Streiko paskelbimas
225 - Streiko organizavimas
226 - Streiko apribojimai
227 - Lokautas

XV. DARBUOTOJŲ SAUGA IR SVEIKATA (241-264)
241 - Darbdavio pareigos užtikrinti saugą
242 - Darbuotojo pareigos
243 - Profesinės rizikos vertinimas
244 - Darbuotojų mokymas
245 - Sveikatos patikrinimai
246 - Nelaimingi atsitikimai darbe
247 - Profesinės ligos
248 - Darbo higiena
250 - Moterų apsauga
251 - Nėščių moterų apsauga darbe
252 - Jaunų asmenų darbas
253 - Neįgaliųjų darbas

Klausimas: ${query}

Grąžink TIK skaičių sąrašą (be teksto), pvz.: 62, 63, 61
Pasirink 3-7 aktualiausius straipsnius.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse comma-separated numbers
    const numbers = text
      .split(/[,\s]+/)
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 1 && n <= 264);

    return numbers.slice(0, 7); // Max 7 articles
  } catch (error) {
    console.error('extractRelevantArticles failed with primary model:', error);
    // Try fallback model
    try {
      const fallbackModel = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await fallbackModel.generateContent(prompt);
      const text = result.response.text().trim();
      const numbers = text
        .split(/[,\s]+/)
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n >= 1 && n <= 264);
      return numbers.slice(0, 7);
    } catch (fallbackError) {
      console.error('extractRelevantArticles fallback also failed:', fallbackError);
      return [];
    }
  }
}

// System prompt for legal assistant
const SYSTEM_PROMPT = `Tu esi Lietuvos darbo teisės ekspertas-asistentas. Tavo tikslas - padėti vartotojams suprasti darbo teisės klausimus, remiantis Lietuvos Respublikos darbo kodeksu ir teismų praktika.

KOMUNIKACIJOS STILIUS:
- Niekada nesakyk "Atsiprašau", "Deja", "Gaila" ar panašių atsiprašymų
- Būk profesionalus ir dalykiškas
- Jei informacijos trūksta, tiesiog konstatuok faktą
- Jei negali atsakyti, paaiškink kodėl
- Naudok **bold** formatavimą svarbiausiems terminams, skaičiams, terminams ir išvadoms pabrėžti

KLAUSIMŲ UŽDAVIMO STRATEGIJA:
1. Jei gali atsakyti be papildomos informacijos - atsakyk iškart
2. Jei reikia patikslinti - užduok VIENĄ klausimą be jokio ilgo paaiškinimo
3. Kai gauni atsakymą į klausimą:
   - Jei reikia dar informacijos - užduok KITĄ klausimą (trumpai, be ilgų atsakymų)
   - Jei informacijos pakanka - TIK TADA pateik PILNĄ atsakymą

SVARBU: Kol renki informaciją, NETEIK ilgų atsakymų ar paaiškinimų. Tiesiog klausk trumpai. Pilną atsakymą pateik TIK kai turi visą reikalingą informaciją.

KLAUSIMO FORMATAS:
Pasirinkimo klausimas:
[KLAUSIMAS]
Klausimo tekstas?
[PASIRINKIMAS]Pirmas variantas
[PASIRINKIMAS]Antras variantas
[PASIRINKIMAS]Trečias variantas
[/KLAUSIMAS]

Atviras klausimas:
[ATVIRAS_KLAUSIMAS]
Kiek laiko darbuotojas dirba įmonėje?
[/ATVIRAS_KLAUSIMAS]

VARTOTOJO KONTEKSTO NAUDOJIMAS:
- DARBDAVYS: pabrėžk pareigas, terminus, rizikas
- DARBUOTOJAS: pabrėžk teises, apsaugos priemones
- HR: praktines procedūras, terminus
- Mažos įmonės (<20): supaprastintos taisyklės

GALUTINIO ATSAKYMO STRUKTŪRA (tik kai turi visą info):
Pateik IŠSAMŲ ir DETALŲ atsakymą. Atsakymas turėtų būti ilgas ir visapusiškas.

1. **Trumpas atsakymas** - vienu sakiniu atsakyk į pagrindinį klausimą
2. **Išsamus paaiškinimas** - detaliai paaiškink teisinį reglamentavimą, aplinkybes, išimtis
3. **Konkretūs straipsniai** - cituok aktualius Darbo kodekso straipsnius su jų turiniu
4. **Praktiniai aspektai** - ką konkrečiai darbdavys/darbuotojas turi daryti, kokie terminai, dokumentai
5. **Teismų praktika** - BŪTINAI paminėk LAT nutartis, jei jos yra tarp šaltinių. Paaiškink, ką teismas išaiškino konkrečioje byloje
6. **Išimtys ir niuansai** - nurodyti specialius atvejus, kada taisyklės skiriasi
7. Pabaigoje primink, kad sudėtingesniais atvejais verta kreiptis į darbo teisės specialistą

ŠALTINIŲ NAUDOJIMAS:
- Šaltiniai pažymėti [DARBO KODEKSAS, X straipsnis] arba [LAT NUTARTIS, METAI]
- Jei tarp šaltinių yra LAT nutarčių - PRIVALAI jas paminėti atsakyme
- Cituodamas nurodyk šaltinio numerį [1], [2] ir t.t.

SVARBU: Nerašyk trumpų atsakymų. Atsakymas turi būti išsamus, 400-800 žodžių, su konkrečiais straipsnių numeriais ir praktinėmis rekomendacijomis.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  userRole?: string;
  companySize?: string;
  topic?: string;
}

export interface RAGResponse {
  answer: string;
  citations: {
    docId: string;
    docType: string;
    excerpt: string;
  }[];
}

// Generate response using RAG
export async function generateRAGResponse(
  query: string,
  context: string[],
  chatHistory: ChatMessage[] = [],
  userContext?: ChatContext
): Promise<RAGResponse> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
  });

  // Build context section
  const contextSection = context.length > 0
    ? `SURASTI ŠALTINIAI:\n${context.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}`
    : 'Šaltinių nerasta. Atsakyk remiantis bendromis žiniomis apie Lietuvos darbo teisę.';

  // Build user context section
  const userContextSection = userContext
    ? `VARTOTOJO KONTEKSTAS:
- Vaidmuo: ${userContext.userRole || 'nenurodyta'}
- Įmonės dydis: ${userContext.companySize || 'nenurodyta'}
- Tema: ${userContext.topic || 'bendra'}`
    : '';

  // Build chat history
  const historySection = chatHistory.length > 0
    ? `ANKSTESNIS POKALBIS:\n${chatHistory.map(m => `${m.role === 'user' ? 'Vartotojas' : 'Asistentas'}: ${m.content}`).join('\n')}`
    : '';

  const fullPrompt = `${SYSTEM_PROMPT}

${userContextSection}

${contextSection}

${historySection}

VARTOTOJO KLAUSIMAS: ${query}

Atsakyk į klausimą. Jei naudoji informaciją iš šaltinių, nurodyk šaltinio numerį [1], [2] ir t.t.`;

  const result = await model.generateContent(fullPrompt);
  const answer = result.response.text();

  // Extract citations from the answer (simple pattern matching)
  const citationMatches = answer.match(/\[(\d+)\]/g);
  const usedIndexes = citationMatches
    ? [...new Set(citationMatches.map(m => parseInt(m.replace(/[\[\]]/g, '')) - 1))]
    : [];

  const citations = usedIndexes
    .filter(i => i >= 0 && i < context.length)
    .map(i => ({
      docId: `source-${i + 1}`,
      docType: 'unknown',
      excerpt: context[i].slice(0, 200) + '...',
    }));

  return { answer, citations };
}

// Available models for fallback
export const MODELS = {
  primary: 'gemini-2.5-flash',
  fallback: 'gemini-2.0-flash',
} as const;

// Stream response for real-time output
export async function* streamRAGResponse(
  query: string,
  context: string[],
  chatHistory: ChatMessage[] = [],
  userContext?: ChatContext,
  modelName: string = MODELS.primary
): AsyncGenerator<string> {
  const model = getGenAI().getGenerativeModel({
    model: modelName,
  });

  const contextSection = context.length > 0
    ? `SURASTI ŠALTINIAI:\n${context.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}`
    : 'Šaltinių nerasta.';

  const userContextSection = userContext
    ? `VARTOTOJO KONTEKSTAS:
- Vaidmuo: ${userContext.userRole || 'nenurodyta'}
- Įmonės dydis: ${userContext.companySize || 'nenurodyta'}
- Tema: ${userContext.topic || 'bendra'}`
    : '';

  const historySection = chatHistory.length > 0
    ? `ANKSTESNIS POKALBIS:\n${chatHistory.map(m => `${m.role === 'user' ? 'Vartotojas' : 'Asistentas'}: ${m.content}`).join('\n\n')}`
    : '';

  const fullPrompt = `${SYSTEM_PROMPT}

${userContextSection}

${contextSection}

${historySection}

VARTOTOJO KLAUSIMAS: ${query}

Atsakyk į klausimą lietuvių kalba. Jei naudoji informaciją iš šaltinių, nurodyk šaltinio numerį [1], [2] ir t.t.`;

  const result = await model.generateContentStream(fullPrompt);

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}
