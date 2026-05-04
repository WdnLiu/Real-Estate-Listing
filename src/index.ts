import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { findProperties, findPropertyById, createContactRequest, createOffer, PropertyFilters } from './services/propertyRepository.js';
import { buildSystemPrompt, parseFiltersFromResponse, ChatMessage } from './lib/searchPrompt.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

function serializeExtras(row: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(row.extras)) {
    row.extras = (row.extras as { name: string }[]).map((e) => e.name);
  }
  return row;
}

app.get('/api/properties', async (req, res) => {
  const { listingType, city, district, neighborhood, minPrice, maxPrice, minRooms, minArea, hasElevator, extras, page, limit } = req.query;

  const districts = district ? (district as string).split(',').filter(Boolean) : undefined;
  const neighborhoods = neighborhood ? (neighborhood as string).split(',').filter(Boolean) : undefined;

  const filters: PropertyFilters = {
    listingType: listingType as 'rent' | 'sale' | undefined,
    city: city as string | undefined,
    districts,
    neighborhoods,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minRooms: minRooms ? Number(minRooms) : undefined,
    minArea: minArea ? Number(minArea) : undefined,
    hasElevator: hasElevator === 'true' ? true : undefined,
    selectedExtras: extras ? (extras as string).split(',').filter(Boolean) : undefined,
  };

  const result = await findProperties(filters, Number(page ?? 1), Number(limit ?? 12));
  result.data = result.data.map((row) => serializeExtras(row as Record<string, unknown>));
  res.json(result);
});

app.get('/api/properties/:id', async (req, res) => {
  const property = await findPropertyById(Number(req.params.id));
  if (!property) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(serializeExtras(property as Record<string, unknown>));
});

app.post('/api/properties/:id/contact', async (req, res) => {
  const propertyId = Number(req.params.id);
  const { name, email, type, message, visitDate } = req.body as {
    name: string; email: string; type: 'info' | 'visit'; message?: string; visitDate?: string;
  };

  if (!name || !email || !type) {
    res.status(400).json({ error: 'name, email and type are required' });
    return;
  }

  await createContactRequest({ propertyId, name, email, type, message, visitDate });
  res.status(201).json({ ok: true });
});

app.post('/api/properties/:id/offers', async (req, res) => {
  const propertyId = Number(req.params.id);
  const { name, email, amount, note } = req.body as {
    name: string; email: string; amount: number; note?: string;
  };

  if (!name || !email || !amount) {
    res.status(400).json({ error: 'name, email and amount are required' });
    return;
  }

  await createOffer({ propertyId, name, email, amount: Number(amount), note });
  res.status(201).json({ ok: true });
});

app.post('/api/search/ai', async (req, res) => {
  const { messages, listingType } = req.body as { messages: ChatMessage[]; listingType: 'rent' | 'sale' };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'AI search not configured.' })}\n\n`);
    res.end();
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents,
      config: { systemInstruction: buildSystemPrompt(listingType ?? 'rent') },
    });

    let fullText = '';
    for await (const chunk of stream) {
      const text = chunk.text ?? '';
      fullText += text;
      res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    }

    const filters = parseFiltersFromResponse(fullText);
    res.write(`data: ${JSON.stringify({ type: 'filters', content: filters })}\n\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ type: 'error', content: message })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
