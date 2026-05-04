import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { normalizeAll } from '../services/normalizerService.js';
import { saveProperties, clearAll, disconnect } from '../services/propertyRepository.js';

const CITIES = ['barcelona', 'madrid'];
const LISTING_TYPES = ['rent', 'sale'] as const;

async function main(): Promise<void> {
  await clearAll();
  console.log('Cleared existing data');

  for (const city of CITIES) {
    for (const listingType of LISTING_TYPES) {
      const path = `results/raw/${city}_${listingType}_raw.json`;
      if (!existsSync(path)) {
        console.warn(`[${city}/${listingType}] ${path} not found — skipping`);
        continue;
      }
      const raws = JSON.parse(readFileSync(path, 'utf-8')) as unknown[];
      const { data, failures } = normalizeAll(raws);
      console.log(
        `[${city}/${listingType}] ${data.length}/${raws.length} normalized (${failures} failed)`,
      );
      const { saved, skipped } = await saveProperties(data);
      console.log(`[${city}/${listingType}] Saved: ${saved}, Skipped (duplicates): ${skipped}`);
    }
  }
}

main().catch(console.error).finally(disconnect);
