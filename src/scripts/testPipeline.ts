import 'dotenv/config';
import { readFileSync } from 'fs';
import { extractAll } from '../services/extractorService.js';

const json = JSON.parse(readFileSync('tests/fixtures/fotocasa_raw.json', 'utf-8'));
const html = readFileSync('tests/fixtures/listing_raw.html', 'utf-8');

console.log('Running pipeline on 1 JSON payload + 1 HTML page...\n');

const { data, failures } = await extractAll([json, html]);

console.log(`Extracted: ${data.length} | Failed: ${failures}\n`);

for (const property of data) {
  console.log('---');
  console.log(JSON.stringify(property, null, 2));
}
