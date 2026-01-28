// MailerSend email service for LegalAI

const MAILERSEND_API_URL = 'https://api.mailersend.com/v1/email';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailParams {
  to: EmailRecipient[];
  subject: string;
  html: string;
  text: string;
  from?: EmailRecipient;
  replyTo?: EmailRecipient;
}

interface MailerSendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<MailerSendResponse> {
  const apiKey = process.env.MAILERSEND_API_KEY;

  if (!apiKey) {
    console.error('MAILERSEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const {
    to,
    subject,
    html,
    text,
    from = { email: 'labas@legalai.lt', name: 'LegalAI' },
    replyTo = { email: 'labas@legalai.lt', name: 'LegalAI' },
  } = params;

  const payload = {
    from: {
      email: from.email,
      name: from.name || 'LegalAI',
    },
    to: to.map((recipient) => ({
      email: recipient.email,
      name: recipient.name || undefined,
    })),
    reply_to: {
      email: replyTo.email,
      name: replyTo.name || 'LegalAI',
    },
    subject,
    html,
    text,
  };

  try {
    const response = await fetch(MAILERSEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 202) {
      const messageId = response.headers.get('x-message-id') || undefined;
      console.log(`Email sent successfully to ${to[0].email}`, { messageId });
      return { success: true, messageId };
    }

    const errorData = await response.json().catch(() => ({}));
    console.error('MailerSend API error:', response.status, errorData);
    return {
      success: false,
      error: errorData.message || `HTTP ${response.status}`,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
