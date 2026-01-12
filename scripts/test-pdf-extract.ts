import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    text += pageText + '\n\n';
  }

  return text;
}

async function testPdfExtract() {
  const legalActId = '46a43c005cd411e79198ffdb108a3753'; // Nepilnamečių įdarbinimas
  const htmlUrl = `https://www.e-tar.lt/portal/lt/legalAct/${legalActId}/asr`;

  console.log('=== Testing PDF Extraction ===\n');
  console.log(`Fetching HTML: ${htmlUrl}`);

  const htmlResponse = await fetch(htmlUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  const html = await htmlResponse.text();
  const pdfMatch = html.match(/href="([^"]*ISO_PDF[^"]*)"/);

  if (!pdfMatch) {
    console.log('No PDF link found!');
    return;
  }

  const pdfUrl = `https://www.e-tar.lt${pdfMatch[1]}`;
  console.log(`\nFetching PDF: ${pdfUrl}`);

  const pdfResponse = await fetch(pdfUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  console.log(`Status: ${pdfResponse.status}`);
  console.log(`Content-Type: ${pdfResponse.headers.get('content-type')}`);

  const buffer = await pdfResponse.arrayBuffer();
  console.log(`Size: ${buffer.byteLength} bytes\n`);

  if (buffer.byteLength < 1000) {
    console.log('PDF too small, showing raw response:');
    console.log(new TextDecoder().decode(buffer));
    return;
  }

  // Extract text
  console.log('Extracting text...\n');
  const text = await extractTextFromPdf(buffer);

  console.log(`Text length: ${text.length} chars\n`);
  console.log('=== First 2000 chars ===\n');
  console.log(text.slice(0, 2000));
}

testPdfExtract().catch(console.error);
