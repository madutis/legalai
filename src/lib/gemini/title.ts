import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
  }
  return genAI;
}

const TITLE_PROMPT = `Sugeneruok trumpa pavadinima siai teisinei konsultacijai lietuviu kalba.
Reikalavimai:
- Maksimum 6 zodziai
- Be kabučių ar skyrybos
- Apibendrina pagrindine tema

Vartotojo klausimas: {userMessage}
Asistento atsakymo santrauka: {assistantSummary}

Pavadinimas:`;

/**
 * Generate a consultation title using Gemini Flash
 * @param userMessage The first user message
 * @param assistantMessage The first assistant response
 * @returns A short Lithuanian title (max 60 chars, max 6 words)
 */
export async function generateConsultationTitle(
  userMessage: string,
  assistantMessage: string
): Promise<string> {
  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = TITLE_PROMPT
      .replace('{userMessage}', userMessage.slice(0, 500))
      .replace('{assistantSummary}', assistantMessage.slice(0, 300));

    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();

    // Clean up: remove quotes, limit length
    const cleanTitle = title.replace(/["""'']/g, '').slice(0, 60);

    return cleanTitle || 'Konsultacija';
  } catch (error) {
    console.error('Title generation failed:', error);
    // Return fallback title on error
    return 'Konsultacija';
  }
}
