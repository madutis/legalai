// Test script to verify we can fetch PDFs from e-tar.lt

async function testFetch() {
  const testCases = [
    {
      name: 'Nutarimas 518-2017 (nepilnamečiai)',
      legalActId: '46a43c005cd411e79198ffdb108a3753',
    },
    {
      name: 'Nutarimas 496-2017 (DK įgyvendinimas)',
      legalActId: '76731a705b4711e79198ffdb108a3753',
    },
    {
      name: 'Nutarimas 469-2017 (nėščios)',
      legalActId: 'eb65c040574a11e7846ef01bfffb9b64',
    },
  ];

  for (const test of testCases) {
    console.log(`\n=== Testing: ${test.name} ===`);

    // Try different URL patterns
    const urls = [
      `https://www.e-tar.lt/rs/legalact/${test.legalActId}/content_files/ISO_PDF/`,
      `https://www.e-tar.lt/rs/actualedition/${test.legalActId}/asr/format/ISO_PDF/`,
      `https://www.e-tar.lt/portal/lt/legalAct/${test.legalActId}/asr`,
    ];

    for (const url of urls) {
      try {
        console.log(`Trying: ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
          redirect: 'follow',
        });

        console.log(`  Status: ${response.status}`);
        console.log(`  Content-Type: ${response.headers.get('content-type')}`);
        console.log(`  Content-Length: ${response.headers.get('content-length')}`);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('pdf')) {
            const buffer = await response.arrayBuffer();
            console.log(`  ✓ Got PDF! Size: ${buffer.byteLength} bytes`);
            break;
          } else if (contentType.includes('html')) {
            const html = await response.text();
            // Look for PDF download links in HTML
            const pdfMatch = html.match(/href="([^"]*ISO_PDF[^"]*)"/);
            if (pdfMatch) {
              console.log(`  Found PDF link in HTML: ${pdfMatch[1]}`);
            }
          }
        }
      } catch (error) {
        console.log(`  Error: ${error}`);
      }
    }
  }
}

testFetch().catch(console.error);
