import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractText } from 'unpdf';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

interface Article {
  num: string;
  title: string;
  text: string;
}

async function main() {
  console.log('Re-ingesting Labor Code with article-aware chunking...\n');

  // Extract text
  const buffer = fs.readFileSync('data/1a0c0297-fa4a-5e63-8dc7-4e0155fb0190.pdf');
  const { text } = await extractText(new Uint8Array(buffer));
  const content = Array.isArray(text) ? text.join('\n\n') : text;
  console.log('Extracted ' + content.length + ' chars\n');

  // Split by article markers (e.g., "123 straipsnis.")
  const articlePattern = /(\d+)\s*straipsnis\.\s*([^\n]+)/g;
  const matches: { num: string; title: string; start: number }[] = [];

  let match;
  while ((match = articlePattern.exec(content)) !== null) {
    matches.push({ num: match[1], title: match[2].trim(), start: match.index });
  }

  // Extract article content
  const articles: Article[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].start;
    const end = i < matches.length - 1 ? matches[i + 1].start : content.length;
    const articleText = content.slice(start, end).trim();

    if (articleText.length > 100) {
      articles.push({
        num: matches[i].num,
        title: matches[i].title,
        text: articleText,
      });
    }
  }

  console.log('Found ' + articles.length + ' articles\n');

  // Sample articles
  console.log('Sample articles:');
  [36, 52, 57, 126, 127].forEach((num) => {
    const art = articles.find((a) => a.num === String(num));
    if (art) {
      console.log('  Art ' + art.num + ': ' + art.title + ' (' + art.text.length + ' chars)');
    }
  });

  // Generate embeddings and upload
  const index = pinecone.index('law-agent');
  console.log('\nGenerating embeddings for ' + articles.length + ' articles...\n');
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  const vectors: any[] = [];
  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];
    const textForEmbed = 'Darbo kodeksas ' + art.num + ' straipsnis: ' + art.title + '\n\n' + art.text;

    try {
      const result = await model.embedContent(textForEmbed.slice(0, 30000));
      vectors.push({
        id: 'darbo-kodeksas-str-' + art.num,
        values: result.embedding.values,
        metadata: {
          docId: 'darbo-kodeksas',
          docType: 'legislation',
          sourceFile: 'darbo-kodeksas.pdf',
          articleNumber: parseInt(art.num),
          articleTitle: art.title,
          text: art.text.slice(0, 4000),
          chunkIndex: i,
          totalChunks: articles.length,
        },
      });

      if ((i + 1) % 20 === 0) {
        console.log('  Processed ' + (i + 1) + '/' + articles.length + ' articles');
      }

      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.error('Error embedding article ' + art.num + ':', err);
    }
  }

  // Upsert in batches
  console.log('\nUploading ' + vectors.length + ' vectors...');
  for (let i = 0; i < vectors.length; i += 100) {
    await index.upsert(vectors.slice(i, i + 100));
  }

  console.log('\nDone! Labor Code re-ingested with article-level chunks.');

  const stats = await index.describeIndexStats();
  console.log('Total vectors in index: ' + stats.totalRecordCount);
}

main().catch(console.error);
