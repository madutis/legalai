import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

async function search(query: string) {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(query);
  const index = pinecone.index('law-agent');
  
  const search = await index.query({
    vector: result.embedding.values,
    topK: 3,
    includeMetadata: true,
    filter: { docId: 'darbo-kodeksas' }
  });
  
  console.log('Query:', query);
  search.matches?.forEach((m, i) => {
    const meta = m.metadata as any;
    console.log('  [' + (i+1) + '] Art.' + meta.articleNumber + ' ' + meta.articleTitle + ' (score:' + m.score?.toFixed(3) + ')');
  });
  console.log('');
}

async function main() {
  await search('susitarimas dėl išbandymo');
  await search('išbandymo terminas trys mėnesiai');
  await search('darbo sutarties nutraukimas darbdavio iniciatyva');
  await search('kasmetinės atostogos trukmė');
  await search('viršvalandžiai apmokėjimas');
}
main();
