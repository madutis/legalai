import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

async function testRAG() {
  console.log('Testing RAG pipeline...\n');

  const testQuery = 'Kokia yra maksimali išbandymo laikotarpio trukmė?';
  console.log(`Query: ${testQuery}\n`);

  // 1. Generate embedding
  console.log('1. Generating embedding...');
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const embeddingResult = await embeddingModel.embedContent(testQuery);
  const queryEmbedding = embeddingResult.embedding.values;
  console.log(`   Embedding dimensions: ${queryEmbedding.length}\n`);

  // 2. Search Pinecone
  console.log('2. Searching Pinecone...');
  const index = pinecone.index('law-agent');
  const searchResult = await index.query({
    vector: queryEmbedding,
    topK: 10,
    includeMetadata: true,
  });

  console.log(`   Found ${searchResult.matches?.length || 0} results:\n`);
  searchResult.matches?.forEach((match, i) => {
    console.log(`   [${i + 1}] Score: ${match.score?.toFixed(3)}`);
    console.log(`       Doc: ${match.metadata?.sourceFile}`);
    console.log(`       Type: ${match.metadata?.docType}`);
    console.log(`       Text preview: ${(match.metadata?.text as string)?.slice(0, 150)}...\n`);
  });

  // 3. Generate response
  console.log('3. Generating response with Gemini...');
  const contextTexts = searchResult.matches?.map(m => m.metadata?.text as string) || [];

  const systemPrompt = `Tu esi Lietuvos darbo teisės ekspertas. Atsakyk į klausimą remiantis pateiktais šaltiniais.

ŠALTINIAI:
${contextTexts.map((t, i) => `[${i + 1}] ${t}`).join('\n\n')}

KLAUSIMAS: ${testQuery}

Atsakyk lietuviškai ir cituok šaltinius [1], [2] etc.`;

  const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const result = await chatModel.generateContent(systemPrompt);

  console.log('\n--- RESPONSE ---\n');
  console.log(result.response.text());
  console.log('\n----------------\n');

  // Check index stats
  const stats = await index.describeIndexStats();
  console.log(`Total vectors in index: ${stats.totalRecordCount}`);
}

testRAG().catch(console.error);
