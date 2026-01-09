import { jsPDF } from 'jspdf';
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

export function exportToPDF(data: ExportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Helper to add text with word wrap
  const addText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);

    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.4;

    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  };

  const addSpace = (mm: number) => {
    y += mm;
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  addText('Darbo teises konsultacija', 18, true);
  addSpace(3);

  // Date
  const dateStr = data.exportedAt.toLocaleDateString('lt-LT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  addText(dateStr, 10, false, [100, 100, 100]);
  addSpace(8);

  // Context section
  if (data.context) {
    addText('Vartotojo profilis:', 12, true);
    addSpace(2);

    if (data.context.topic) {
      addText(`Tema: ${data.context.topic}`, 10);
    }
    if (data.context.userRole) {
      addText(`Vaidmuo: ${formatRole(data.context.userRole)}`, 10);
    }
    if (data.context.companySize) {
      addText(`Imones dydis: ${formatCompanySize(data.context.companySize)}`, 10);
    }
    addSpace(8);
  }

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  addSpace(8);

  // Messages
  addText('Pokalbis:', 12, true);
  addSpace(4);

  for (const message of data.messages) {
    const isUser = message.role === 'user';
    const label = isUser ? 'Klausimas:' : 'Atsakymas:';
    const labelColor: [number, number, number] = isUser ? [0, 100, 0] : [0, 0, 150];

    addText(label, 10, true, labelColor);
    addSpace(1);

    const cleanedContent = cleanText(message.content);
    addText(cleanedContent, 10);
    addSpace(6);
  }

  // Footer
  addSpace(4);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  addSpace(4);
  addText('Tai nera teisine konsultacija. Sudetingais atvejais kreipkites i teisininkai.', 8, false, [150, 150, 150]);
  addText('Sugeneruota: legalai.lt', 8, false, [150, 150, 150]);

  // Save
  const filename = `konsultacija-${data.exportedAt.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
