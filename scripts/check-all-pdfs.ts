import { extractText } from 'unpdf';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const dataDir = 'data';
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.pdf') && !f.startsWith('.'));
  
  console.log('Checking', files.length, 'root PDFs for text...\n');
  
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const buffer = fs.readFileSync(filePath);
    const { text } = await extractText(new Uint8Array(buffer));
    const content = Array.isArray(text) ? text.join('') : text;
    const charCount = content.replace(/\s/g, '').length;
    
    if (charCount > 1000) {
      console.log(`✓ ${file}: ${charCount} chars`);
    }
  }
}
main();
