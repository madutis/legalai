import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const INDEX_NAME = 'law-agent';
const DIMENSION = 768; // text-embedding-004 dimension

async function setupPinecone() {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  console.log('Checking existing indexes...');
  const indexes = await pc.listIndexes();
  console.log('Existing indexes:', indexes.indexes?.map((i) => i.name) || []);

  const existingIndex = indexes.indexes?.find((i) => i.name === INDEX_NAME);

  if (existingIndex) {
    console.log(`Index "${INDEX_NAME}" already exists`);
    console.log('Index details:', existingIndex);
  } else {
    console.log(`Creating index "${INDEX_NAME}"...`);
    await pc.createIndex({
      name: INDEX_NAME,
      dimension: DIMENSION,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });
    console.log(`Index "${INDEX_NAME}" created successfully!`);
  }

  // Wait for index to be ready and get stats
  console.log('\nWaiting for index to be ready...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    const index = pc.index(INDEX_NAME);
    const stats = await index.describeIndexStats();
    console.log('Index stats:', stats);
  } catch (e) {
    console.log('Index still initializing, but created successfully.');
  }
}

setupPinecone().catch(console.error);
