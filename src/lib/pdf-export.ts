'use client';

import type { Message } from '@/hooks/useChat';

interface ExportContext {
  topic?: string;
  userRole?: string;
  companySize?: string;
}

interface ExportData {
  messages: Message[];
  context?: ExportContext;
  exportedAt: Date;
}

// Remove markdown and special tags from text
function cleanText(text: string): string {
  return text
    // Remove question tags
    .replace(/\[KLAUSIMAS\][\s\S]*?\[\/KLAUSIMAS\]/g, '')
    .replace(/\[ATVIRAS_KLAUSIMAS\][\s\S]*?\[\/ATVIRAS_KLAUSIMAS\]/g, '')
    .replace(/\[PASIRINKIMAS\]/g, '')
    // Remove markdown bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove citation brackets
    .replace(/\[\d+\]/g, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Format role label in Lithuanian
function formatRole(role: string): string {
  switch (role) {
    case 'employer': return 'Darbdavys';
    case 'employee': return 'Darbuotojas';
    case 'hr': return 'HR specialistas';
    default: return role || 'Nenurodyta';
  }
}

// Format company size in Lithuanian
function formatCompanySize(size: string): string {
  switch (size) {
    case 'micro': return 'Mikro (iki 10)';
    case 'small': return 'Maža (10-49)';
    case 'medium': return 'Vidutinė (50-249)';
    case 'large': return 'Didelė (250+)';
    default: return size || 'Nenurodyta';
  }
}

// Escape HTML special characters
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

export function exportToPDF(data: ExportData): void {
  const dateStr = data.exportedAt.toLocaleDateString('lt-LT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Build HTML content
  let messagesHtml = '';
  for (const message of data.messages) {
    const isUser = message.role === 'user';
    const label = isUser ? 'Klausimas:' : 'Atsakymas:';
    const labelColor = isUser ? '#166534' : '#1e40af';
    const cleanedContent = escapeHtml(cleanText(message.content));

    messagesHtml += `
      <div style="margin-bottom: 20px;">
        <p style="color: ${labelColor}; font-weight: bold; margin-bottom: 5px;">${label}</p>
        <p style="margin: 0; line-height: 1.6;">${cleanedContent}</p>
      </div>
    `;
  }

  const contextHtml = data.context ? `
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">Vartotojo profilis:</h2>
      ${data.context.topic ? `<p style="margin: 5px 0;">Tema: ${escapeHtml(data.context.topic)}</p>` : ''}
      ${data.context.userRole ? `<p style="margin: 5px 0;">Vaidmuo: ${formatRole(data.context.userRole)}</p>` : ''}
      ${data.context.companySize ? `<p style="margin: 5px 0;">Įmonės dydis: ${formatCompanySize(data.context.companySize)}</p>` : ''}
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html lang="lt">
    <head>
      <meta charset="UTF-8">
      <title>Darbo teisės konsultacija</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #1f2937;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }

        h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .date {
          color: #6b7280;
          font-size: 11px;
          margin-bottom: 25px;
        }

        .divider {
          border-top: 1px solid #e5e7eb;
          margin: 20px 0;
        }

        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
          font-size: 10px;
          color: #9ca3af;
        }

        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <h1>Darbo teisės konsultacija</h1>
      <p class="date">${dateStr}</p>

      ${contextHtml}

      <div class="divider"></div>

      <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 15px;">Pokalbis:</h2>
      ${messagesHtml}

      <div class="footer">
        <p>Tai nėra teisinė konsultacija. Sudėtingais atvejais kreipkitės į teisininką.</p>
        <p>Sugeneruota: legalai.lt</p>
      </div>
    </body>
    </html>
  `;

  // Open in new window and trigger print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for fonts to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}
