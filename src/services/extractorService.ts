import { ExtractedProperty } from '../models/Property.js';
import { extractFromHtml, extractFromJson } from './llmExtractorService.js';

function isHtml(input: unknown): input is string {
  if (typeof input !== 'string') return false;
  const trimmed = input.trimStart();
  return trimmed.startsWith('<') || trimmed.toLowerCase().includes('<html');
}

export async function extract(input: unknown): Promise<ExtractedProperty | null> {
  if (isHtml(input)) return extractFromHtml(input as string);
  return extractFromJson(input);
}

export async function extractAll(
  inputs: unknown[],
): Promise<{ data: ExtractedProperty[]; failures: number }> {
  const results = await Promise.allSettled(inputs.map(extract));
  const data: ExtractedProperty[] = [];
  let failures = 0;

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      data.push(result.value);
    } else {
      failures++;
    }
  }

  return { data, failures };
}
