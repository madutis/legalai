import { NextResponse } from 'next/server';
import { generateWelcomeEmailHtml } from '@/lib/email/templates/welcome';

// Preview email template (dev only)
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const html = generateWelcomeEmailHtml({ userName: 'Jonas' });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
