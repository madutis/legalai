// Send welcome email to new users

import { sendEmail } from './mailersend';
import { generateWelcomeEmailHtml, generateWelcomeEmailText } from './templates/welcome';

interface SendWelcomeEmailParams {
  email: string;
  name?: string;
}

export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<boolean> {
  const { email, name } = params;

  // Extract first name if full name provided
  const firstName = name?.split(' ')[0];

  const html = generateWelcomeEmailHtml({ userName: firstName });
  const text = generateWelcomeEmailText({ userName: firstName });

  const result = await sendEmail({
    to: [{ email, name }],
    subject: 'Sveiki atvykę į LegalAI! 🎉',
    html,
    text,
  });

  return result.success;
}
