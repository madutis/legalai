/**
 * Generate a consultation title using Gemini Flash via API route
 * @param userMessage The first user message
 * @param assistantMessage The first assistant response
 * @returns A short Lithuanian title (max 60 chars, max 6 words)
 */
export async function generateConsultationTitle(
  userMessage: string,
  assistantMessage: string
): Promise<string> {
  try {
    const response = await fetch('/api/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, assistantMessage }),
    });

    if (!response.ok) {
      console.error('Title API error:', response.status);
      return 'Konsultacija';
    }

    const data = await response.json();
    return data.title || 'Konsultacija';
  } catch (error) {
    console.error('Title generation failed:', error);
    return 'Konsultacija';
  }
}
