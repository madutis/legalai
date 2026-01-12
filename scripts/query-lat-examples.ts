import { generateEmbedding } from '../src/lib/gemini';
import { searchHybrid, getIndex } from '../src/lib/pinecone';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  // Test hybrid search with nutarimai
  const query = 'kaip įdarbinti nepilnametį darbuotoją';
  console.log('Query:', query, '\n');

  const embedding = await generateEmbedding(query);
  const results = await searchHybrid(embedding, 8, 4, 2);

  const leg = results.filter(r => r.metadata.docType === 'legislation');
  const rul = results.filter(r => r.metadata.docType === 'ruling');
  const nut = results.filter(r => r.metadata.docType === 'nutarimas');

  console.log(`Results: ${leg.length} legislation, ${rul.length} rulings, ${nut.length} nutarimai\n`);

  if (nut.length > 0) {
    console.log('Nutarimai found:');
    for (const n of nut) {
      console.log(`  📋 ${n.metadata.docId} (${n.score.toFixed(3)})`);
      console.log(`     ${n.metadata.title}`);
    }
  }
}

main().catch(console.error);
