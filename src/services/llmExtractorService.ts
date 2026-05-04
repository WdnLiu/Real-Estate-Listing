import { GoogleGenAI, Type } from '@google/genai';
import { ExtractedProperty, ExtractedPropertySchema } from '../models/Property.js';
import { APARTMENT_IMAGE_URLS } from '../constants/apartmentImages.js';

const PROPERTY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    listingType: { type: Type.STRING, enum: ['rent', 'sale'] },
    title: { type: Type.STRING },
    price: { type: Type.NUMBER },
    currency: { type: Type.STRING },
    areaSqm: { type: Type.NUMBER },
    rooms: { type: Type.INTEGER },
    bathrooms: { type: Type.INTEGER },
    floor: { type: Type.INTEGER, nullable: true },
    hasElevator: { type: Type.BOOLEAN },
    extras: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: ['parking', 'storage unit', 'terrace', 'air conditioning', 'pool', 'garden'] },
    },
    location: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING },
        district: { type: Type.STRING, nullable: true },
        neighborhood: { type: Type.STRING, nullable: true },
        address: { type: Type.STRING, nullable: true },
      },
      required: ['city'],
    },
    description: { type: Type.STRING },
    listingUrl: { type: Type.STRING, nullable: true },
    contactPhone: { type: Type.STRING, nullable: true },
    images: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['listingType', 'title', 'price', 'areaSqm', 'rooms', 'location', 'description'],
};

const SYSTEM_INSTRUCTION = `You are a property data extractor. Given real estate listing content (HTML text or a JSON payload), extract the property details and return them as structured JSON. If a field is not present in the content, omit it or use null — do not guess or invent values. For extras, only include items explicitly mentioned: parking, storage unit, terrace, air conditioning, pool, garden.`;

function stripNulls(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, stripNulls(v)])
    );
  }
  return obj;
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style|nav|footer|header|head|aside)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

function pickRandomImages(count = 2): string[] {
  const pool = [...APARTMENT_IMAGE_URLS];
  const result: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

async function extractWithGemini(content: string): Promise<ExtractedProperty | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Extract property listing details from the following content:\n\n${content}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: PROPERTY_SCHEMA,
    },
  });

  try {
    const raw = JSON.parse(response.text ?? '');
    const cleaned = stripNulls(raw) as Record<string, unknown>;
    if (cleaned.currency !== undefined) cleaned.currency = 'EUR';
    if (!Array.isArray(cleaned.images) || (cleaned.images as string[]).length === 0) {
      cleaned.images = pickRandomImages(2);
    }
    const result = ExtractedPropertySchema.safeParse(cleaned);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function extractFromHtml(html: string): Promise<ExtractedProperty | null> {
  return extractWithGemini(stripHtml(html));
}

export async function extractFromJson(obj: unknown): Promise<ExtractedProperty | null> {
  return extractWithGemini(JSON.stringify(obj, null, 2));
}
