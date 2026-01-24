import type { ChatSource } from '@/types';

export function formatSource(source: ChatSource): string | null {
  if (source.docType === 'legislation' && source.articleNumber) {
    const lawLabel = source.lawCode === 'DSS' ? 'DSS' :
                    source.lawCode === 'PSS' ? 'PSS' : 'DK';
    return `${lawLabel} ${source.articleNumber} str.`;
  }
  if (source.docType === 'lat_ruling') {
    if (source.caseNumber) {
      return `LAT ${source.caseNumber}`;
    }
    const yearMatch = source.sourceFile?.match(/(\d{4})/) || source.docId?.match(/^(\d{4})-/);
    if (yearMatch) {
      return `LAT ${yearMatch[1]}`;
    }
    return 'LAT nutartis';
  }
  if (source.docType === 'nutarimas') {
    const match = source.docId.match(/nutarimas-(\d+)-(\d+)/);
    if (match) {
      return `Nut. ${match[1]}`;
    }
    return 'Nutarimas';
  }
  if (source.docType === 'vdi_faq') {
    return 'VDI DUK';
  }
  if (source.docType === 'vdi_doc') {
    return source.title ? `VDI: ${source.title.slice(0, 30)}${source.title.length > 30 ? '...' : ''}` : 'VDI Dokumentas';
  }
  return null;
}

export function getSourceUrl(source: ChatSource): string | null {
  if (source.docType === 'legislation' && source.articleNumber) {
    let eTarDocId = 'f6d686707e7011e6b969d7ae07280e89'; // DK default
    if (source.lawCode === 'DSS') eTarDocId = 'TAR.95C79D036AA4';
    if (source.lawCode === 'PSS') eTarDocId = 'TAR.9CBB77180BFE';
    return `https://www.e-tar.lt/portal/lt/legalAct/${eTarDocId}/asr#part_${source.articleNumber}`;
  }
  if ((source.docType === 'lat_ruling') && source.sourceUrl) {
    const pageAnchor = source.sourcePage ? `#page=${source.sourcePage}` : '';
    return `${source.sourceUrl}${pageAnchor}`;
  }
  if (source.docType === 'vdi_faq') {
    return 'https://vdi.lrv.lt/lt/dazniausiai-uzduodami-klausimai/';
  }
  if (source.docType === 'vdi_doc' && source.sourceUrl) {
    return source.sourceUrl;
  }
  return null;
}
