import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pc.index('law-agent');

  const results = await index.query({
    vector: new Array(768).fill(0.01),
    topK: 100,
    filter: { docType: 'ruling' },
    includeMetadata: true
  });

  const withNumber = (results.matches || []).filter(m => (m.metadata as any)?.caseNumber);
  const withUrl = (results.matches || []).filter(m => (m.metadata as any)?.sourceUrl);

  console.log('Total ruling vectors found:', results.matches?.length || 0);
  console.log('With case numbers:', withNumber.length);
  console.log('With source URLs:', withUrl.length);

  if (withNumber.length > 0) {
    console.log('\nSample cases with numbers:');
    withNumber.slice(0, 5).forEach(m => {
      const meta = m.metadata as any;
      console.log(' -', meta.caseNumber, '|', (meta.caseTitle || '').slice(0, 50));
    });
  }
}
check();
