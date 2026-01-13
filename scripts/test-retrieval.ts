import { generateEmbedding } from '../src/lib/gemini/index.js';
import { searchHybrid } from '../src/lib/pinecone/index.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function test() {
  const query = 'Kokios pasekmės darbdaviui už neteisėtą atleidimą?';
  console.log('Query:', query, '\n');

  const embedding = await generateEmbedding(query);
  const results = await searchHybrid(embedding, 8, 6, 2);

  console.log('Results by type:');
  const byType: Record<string, number> = {};
  results.forEach(r => {
    byType[r.metadata.docType] = (byType[r.metadata.docType] || 0) + 1;
  });
  console.log(byType);

  console.log('\nRulings found:');
  results.filter(r => r.metadata.docType === 'ruling').forEach(r => {
    console.log(' -', r.score.toFixed(3), r.metadata.caseNumber || 'no number', '|', (r.metadata.caseTitle || '').slice(0, 60));
  });

  console.log('\nNutarimai found:');
  results.filter(r => r.metadata.docType === 'nutarimas').forEach(r => {
    console.log(' -', r.score.toFixed(3), r.metadata.docId);
  });
}
test();
