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
  const model = getGenAI().getGenerativeModel({ model: 'gemini-3-flash-preview' });

  const prompt = `Tu esi Lietuvos darbo teisės ekspertas. Vartotojas užduoda klausimą apie darbo teisę.
Nustatyk, kurie Darbo kodekso straipsniai gali būti aktualūs šiam klausimui.

Darbo kodekso struktūra:
- 1-20 str.: Bendrosios nuostatos
- 21-40 str.: Darbo sutartis (sudarymas, sąlygos, išbandymas - 36 str.)
- 41-60 str.: Darbo sutarties nutraukimas (57 str. - darbdavio iniciatyva)
- 61-100 str.: Specialios darbo sutartys (terminuota, laikinas darbas, nuotolinis)
- 101-125 str.: Darbo laikas (111 str.), viršvalandžiai (119 str.)
- 126-145 str.: Atostogos (126 str. kasmetinės, 131 str. tikslinės, 137 str. nemokamos)
- 146-160 str.: Darbo užmokestis, žalos atlyginimas
- 161-180 str.: Darbo taryba ir patikėtinis:
  - 165 str.: Darbo tarybos sudarymas
  - 167 str.: Darbo tarybos narių veiklos garantijos (finansavimas, patalpos, priemonės)
  - 168 str.: Darbuotojų atstovų pareigų atlikimo garantijos (60 val./metus, mokamas laikas, mokymai)
  - 169 str.: Darbo tarybos rinkimai
  - 170 str.: Darbo tarybos sudėtis
  - 172 str.: Narystė darbo taryboje
  - 173 str.: Darbo tarybos veiklos organizavimas, pranešimas VDI
  - 176 str.: Darbo tarybos veiklos pasibaigimas
  - 177 str.: Darbuotojų patikėtinis (kai <20 darbuotojų, taikomos darbo tarybos taisyklės)
- 181-212 str.: Kolektyvinės sutartys
- 213-260 str.: Darbo ginčai

Klausimas: ${query}

Grąžink TIK skaičių sąrašą (be teksto), pvz.: 176, 170, 172
Jei neaišku kokie straipsniai aktualūs, grąžink tuščią atsakymą.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse comma-separated numbers
    const numbers = text
      .split(/[,\s]+/)
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 1 && n <= 264);

    return numbers.slice(0, 5); // Max 5 articles
  } catch {
    return [];
  }
}

// System prompt for legal assistant
const SYSTEM_PROMPT = `Tu esi Lietuvos darbo teisės ekspertas-asistentas. Tavo tikslas - padėti vartotojams suprasti darbo teisės klausimus, remiantis Lietuvos Respublikos darbo kodeksu ir teismų praktika.

KOMUNIKACIJOS STILIUS:
- Niekada nesakyk "Atsiprašau", "Deja", "Gaila" ar panašių atsiprašymų
- Būk profesionalus ir dalykiškas
- Jei informacijos trūksta, tiesiog konstatuok faktą
- Jei negali atsakyti, paaiškink kodėl

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
1. Aiškus atsakymas į klausimą
2. Konkretūs Darbo kodekso straipsniai
3. Teismų praktika (LAT) jei aktualu
4. Primink apie teisinę konsultaciją`;

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
    model: 'gemini-2.0-flash-exp', // Gemini 3 Flash when available, using 2.0 flash for now
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
  primary: 'gemini-3-flash-preview',
  fallback: 'gemini-2.5-flash-preview-05-20',
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
