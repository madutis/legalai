'use client';

import type { Message } from '@/hooks/useChat';
import { getTopicById } from '@/lib/topics';

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

// Convert markdown to HTML for proper formatting
function markdownToHtml(text: string): string {
  return text
    // Remove question tags
    .replace(/\[KLAUSIMAS\][\s\S]*?\[\/KLAUSIMAS\]/g, '')
    .replace(/\[ATVIRAS_KLAUSIMAS\][\s\S]*?\[\/ATVIRAS_KLAUSIMAS\]/g, '')
    .replace(/\[PASIRINKIMAS\]/g, '')
    // Remove citation brackets
    .replace(/\[\d+\]/g, '')
    // Escape HTML first (but preserve newlines for processing)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Convert markdown bold to HTML
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Convert markdown italic to HTML
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Convert markdown links [text](url) to HTML
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2563eb;">$1</a>')
    // Convert numbered lists (lines starting with "1. ", "2. ", etc.)
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li style="margin-left: 20px;">$2</li>')
    // Convert bullet lists (lines starting with "- " or "* ")
    .replace(/^[-*]\s+(.+)$/gm, '<li style="margin-left: 20px;">$1</li>')
    // Convert headers
    .replace(/^###\s+(.+)$/gm, '<h4 style="font-weight: 600; margin: 15px 0 8px;">$1</h4>')
    .replace(/^##\s+(.+)$/gm, '<h3 style="font-weight: 600; margin: 15px 0 8px;">$1</h3>')
    .replace(/^#\s+(.+)$/gm, '<h3 style="font-weight: 700; margin: 15px 0 8px;">$1</h3>')
    // Convert double newlines to paragraph breaks
    .replace(/\n\n+/g, '</p><p style="margin: 10px 0;">')
    // Convert single newlines to line breaks
    .replace(/\n/g, '<br>')
    // Clean up extra whitespace
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

// Escape HTML special characters (for plain text like topic/context)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Build source URL
function getSourceUrl(source: any): string | null {
  if (source.docType === 'legislation' && source.articleNumber) {
    return `https://www.e-tar.lt/portal/lt/legalAct/f6d686707e7011e6b969d7ae07280e89/asr#part_${source.articleNumber}`;
  }
  if (source.docType === 'lat_ruling' && source.sourceUrl) {
    const pageAnchor = source.sourcePage ? `#page=${source.sourcePage}` : '';
    return `${source.sourceUrl}${pageAnchor}`;
  }
  if (source.docType === 'nutarimas' && source.sourceFile?.startsWith('e-tar.lt/')) {
    const etarId = source.sourceFile.replace('e-tar.lt/', '');
    return `https://www.e-tar.lt/portal/lt/legalAct/${etarId}`;
  }
  return null;
}

// Format source label
function formatSourceLabel(source: any): string {
  if (source.docType === 'legislation' && source.articleNumber) {
    return `DK ${source.articleNumber} str.${source.articleTitle ? ` - ${source.articleTitle}` : ''}`;
  }
  if (source.docType === 'lat_ruling') {
    return source.caseNumber ? `LAT Nr. ${source.caseNumber}` : 'LAT nutartis';
  }
  if (source.docType === 'nutarimas') {
    return source.title || 'Vyriausybės nutarimas';
  }
  return source.docId || 'Šaltinis';
}

export function exportToPDF(data: ExportData): void {
  const dateStr = data.exportedAt.toLocaleDateString('lt-LT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Collect all sources from messages
  const allSources: any[] = [];
  const seenIds = new Set<string>();
  for (const message of data.messages) {
    if (message.sources) {
      for (const source of message.sources) {
        const key = source.id || source.docId;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          allSources.push(source);
        }
      }
    }
  }

  // Build HTML content
  let messagesHtml = '';
  for (const message of data.messages) {
    const isUser = message.role === 'user';
    const label = isUser ? 'Klausimas:' : 'Atsakymas:';
    const labelColor = isUser ? '#166534' : '#1e40af';
    const formattedContent = isUser
      ? escapeHtml(message.content)
      : markdownToHtml(message.content);

    messagesHtml += `
      <div style="margin-bottom: 24px;">
        <p style="color: ${labelColor}; font-weight: bold; margin-bottom: 8px;">${label}</p>
        <div style="margin: 0; line-height: 1.7;"><p style="margin: 10px 0;">${formattedContent}</p></div>
      </div>
    `;
  }

  const topicLabel = data.context?.topic ? getTopicById(data.context.topic)?.labelLT : null;

  const contextHtml = data.context ? `
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">Konsultacijos informacija:</h2>
      ${topicLabel ? `<p style="margin: 5px 0;">Tema: ${escapeHtml(topicLabel)}</p>` : ''}
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
          @page {
            margin: 0;
          }

          body {
            padding: 15mm;
          }
        }
      </style>
    </head>
    <body>
      <h1>Darbo teisės konsultacija</h1>
      <p class="date">${dateStr}</p>

      ${contextHtml}

      <div class="divider"></div>

      ${messagesHtml}

      ${allSources.length > 0 ? `
        <div class="divider"></div>
        <div style="margin-top: 20px;">
          <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 10px;">Šaltiniai:</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 11px;">
            ${allSources.map(source => {
              const url = getSourceUrl(source);
              const label = formatSourceLabel(source);
              return url
                ? `<li style="margin: 5px 0;"><a href="${url}" style="color: #2563eb;">${escapeHtml(label)}</a></li>`
                : `<li style="margin: 5px 0;">${escapeHtml(label)}</li>`;
            }).join('')}
          </ul>
        </div>
      ` : ''}

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
