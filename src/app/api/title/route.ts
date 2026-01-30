import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const TITLE_PROMPT = `Sugeneruok trumpa pavadinima siai teisinei konsultacijai lietuviu kalba.
Reikalavimai:
- Maksimum 6 zodziai
- Be kabučių ar skyrybos
- Apibendrina pagrindine tema

Vartotojo klausimas: {userMessage}
Asistento atsakymo santrauka: {assistantSummary}

Pavadinimas:`;

export async function POST(request: NextRequest) {
  try {
    const { userMessage, assistantMessage } = await request.json();

    if (!userMessage || !assistantMessage) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_GENERATIVE_AI_API_KEY not configured');
      return NextResponse.json({ title: 'Konsultacija' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = TITLE_PROMPT
      .replace('{userMessage}', userMessage.slice(0, 500))
      .replace('{assistantSummary}', assistantMessage.slice(0, 300));

    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();

    // Clean up: remove quotes, limit length
    const cleanTitle = title.replace(/["""'']/g, '').slice(0, 60);

    return NextResponse.json({ title: cleanTitle || 'Konsultacija' });
  } catch (error) {
    console.error('Title generation failed:', error);
    return NextResponse.json({ title: 'Konsultacija' });
  }
}
