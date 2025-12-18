import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

async function test() {
  const query = 'išbandymo laikotarpis trukmė';
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(query);
  const index = pinecone.index('law-agent');
  
  // Search with filter for new articles
  const search = await index.query({
    vector: result.embedding.values,
    topK: 5,
    includeMetadata: true,
    filter: { docId: 'darbo-kodeksas' }
  });
  
  console.log('Query:', query);
  console.log('Results with filter docId=darbo-kodeksas:\n');
  search.matches?.forEach((m, i) => {
    const meta = m.metadata as any;
    console.log('[' + (i+1) + '] Score:', m.score?.toFixed(3));
    console.log('    ID:', m.id);
    console.log('    Article:', meta.articleNumber, '-', meta.articleTitle);
    console.log('    Text:', meta.text?.slice(0, 200) + '...\n');
  });
}
test();
