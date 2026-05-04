import { readFileSync } from 'fs';
import { join } from 'path';

const html = readFileSync(join(__dirname, '../fixtures/listing_raw.html'), 'utf-8');

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  Type: {
    OBJECT: 'object', STRING: 'string', NUMBER: 'number',
    INTEGER: 'integer', BOOLEAN: 'boolean', ARRAY: 'array',
  },
}));

import { extractFromHtml, extractFromJson } from '../../src/services/llmExtractorService';

const EXTRACTED_PROPERTY = {
  listingType: 'sale',
  title: 'Elegante piso en el barrio de Salamanca',
  price: 485000,
  currency: 'EUR',
  areaSqm: 110,
  rooms: 4,
  bathrooms: 2,
  floor: 3,
  hasElevator: true,
  extras: ['parking', 'storage unit', 'air conditioning'],
  location: {
    city: 'Madrid',
    district: 'Salamanca',
    neighborhood: 'Recoletos',
    address: 'Calle de Serrano, 47',
  },
  description: 'Magnífico piso de 110 m² en pleno barrio de Salamanca.',
  listingUrl: 'https://idealista.com/listing/67890',
  contactPhone: '+34 911 234 567',
  images: [],
};

describe('extractFromHtml — HTML fixture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(EXTRACTED_PROPERTY),
    });
  });

  it('returns a non-null result', async () => {
    const result = await extractFromHtml(html);
    expect(result).not.toBeNull();
  });

  it('passes stripped text to the LLM — no script or style content', async () => {
    await extractFromHtml(html);
    const prompt = mockGenerateContent.mock.calls[0][0].contents as string;
    expect(prompt).not.toMatch(/window\.__data/);
    expect(prompt).not.toMatch(/color: red/);
  });

  it('passes stripped text to the LLM — nav and footer removed', async () => {
    await extractFromHtml(html);
    const prompt = mockGenerateContent.mock.calls[0][0].contents as string;
    expect(prompt).not.toMatch(/Inicio/);
    expect(prompt).not.toMatch(/Real Estate Platform/);
  });

  it('maps the LLM response through Zod and returns a valid property', async () => {
    const result = await extractFromHtml(html);
    expect(result!.listingType).toBe('sale');
    expect(result!.price).toBe(485000);
    expect(result!.location.city).toBe('Madrid');
    expect(result!.extras).toContain('parking');
  });

  it('returns null when the LLM returns unparseable JSON', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'not json' });
    const result = await extractFromHtml(html);
    expect(result).toBeNull();
  });

  it('returns null when the LLM response fails Zod validation', async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ title: 'incomplete' }) });
    const result = await extractFromHtml(html);
    expect(result).toBeNull();
  });

  it('throws when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(extractFromHtml(html)).rejects.toThrow('GEMINI_API_KEY not set');
  });
});

describe('extractFromJson — JSON payload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(EXTRACTED_PROPERTY),
    });
  });

  it('passes the JSON payload as stringified content to the LLM', async () => {
    const input = { title: 'Flat', price: 485000 };
    await extractFromJson(input);
    const prompt = mockGenerateContent.mock.calls[0][0].contents as string;
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('485000');
  });

  it('maps the LLM response through Zod and returns a valid property', async () => {
    const result = await extractFromJson({ anything: true });
    expect(result!.listingType).toBe('sale');
    expect(result!.price).toBe(485000);
  });

  it('returns null when the LLM returns unparseable JSON', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'bad' });
    expect(await extractFromJson({})).toBeNull();
  });

  it('throws when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(extractFromJson({})).rejects.toThrow('GEMINI_API_KEY not set');
  });
});
