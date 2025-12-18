import { extractText } from 'unpdf';
import * as fs from 'fs';

async function main() {
  const buffer = fs.readFileSync('data/1a0c0297-fa4a-5e63-8dc7-4e0155fb0190.pdf');
  const { text } = await extractText(new Uint8Array(buffer));
  const content = Array.isArray(text) ? text.join('\n\n') : text;
  console.log('Total chars:', content.length);
  console.log('\n--- SAMPLE (chars 0-2000) ---\n');
  console.log(content.slice(0, 2000));
  console.log('\n--- SAMPLE (chars 10000-12000) ---\n');
  console.log(content.slice(10000, 12000));
}
main();
