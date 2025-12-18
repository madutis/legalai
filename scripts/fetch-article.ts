import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

async function test() {
  const index = pinecone.index('law-agent');
  const result = await index.fetch(['darbo-kodeksas-str-36']);
  const record = result.records['darbo-kodeksas-str-36'];
  if (record) {
    console.log('Article 36 found!');
    console.log('Metadata:', JSON.stringify(record.metadata, null, 2));
  } else {
    console.log('Article 36 not found in index');
  }
}
test();
