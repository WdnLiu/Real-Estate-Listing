import { CITY_LOCATIONS } from '../constants/locations.js';

export interface ParsedFilters {
  city?: string;
  districts?: string[];
  neighborhoods?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  minArea?: number;
  hasElevator?: boolean;
  selectedExtras?: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

function buildLocationContext(): string {
  return Object.entries(CITY_LOCATIONS)
    .map(([city, { districts, neighborhoods }]) =>
      `- ${city}: districts [${districts.join(', ')}], neighborhoods [${neighborhoods.join(', ')}]`
    )
    .join('\n');
}

export function buildSystemPrompt(listingType: 'rent' | 'sale'): string {
  return `You are a real estate search assistant for a listings platform in Spain. You help users find properties through conversation.

Available locations:
${buildLocationContext()}

The user is browsing ${listingType} listings (${listingType === 'rent' ? 'prices are monthly €' : 'prices are total €'}).

For each user message:
1. Write 2-3 sentences acknowledging what you understood, referencing previous context in the conversation when relevant.
2. Then output a JSON block wrapped in <FILTERS> and </FILTERS> tags reflecting the full search intent so far:
{
  "city": "Barcelona" | "Madrid" | null,
  "districts": [],
  "neighborhoods": [],
  "minPrice": number | null,
  "maxPrice": number | null,
  "minRooms": number | null,
  "minArea": number | null,
  "hasElevator": true | null,
  "extras": [] // subset of: parking, storage unit, terrace, air conditioning, pool, garden
}

Rules:
- Only include districts and neighborhoods that exist in the available locations list above
- If the user mentions a specific address, landmark, monument, park, office building, or iconic location, use your geographic knowledge to identify which district it falls in and select it
- If the user refines a previous request ("actually make it cheaper", "add a parking spot"), update the filters accordingly — carry over constraints not explicitly changed
- Set fields to null if not implied by any message in the conversation
- The districts and neighborhoods arrays should be empty [] if none are specified

Interpret ambiguous adjectives as follows:

PRICE adjectives:
- "cheap", "budget", "affordable", "inexpensive", "economical", "low-cost", "bargain": set maxPrice = ${listingType === 'rent' ? 900 : 250000}
- "reasonable", "moderate", "mid-range", "decent": set maxPrice = ${listingType === 'rent' ? 1400 : 400000}
- "expensive", "pricey", "high-end", "luxury", "premium", "upscale", "exclusive", "lavish", "top-end": set minPrice = ${listingType === 'rent' ? 2000 : 500000}

SIZE adjectives (area in m²):
- "big", "large", "spacious", "roomy", "generous", "ample", "wide": set minArea = 80
- "very large", "huge", "massive", "enormous", "grand", "palatial": set minArea = 120
- "small", "cozy", "compact", "intimate", "snug", "tiny", "micro": no minArea filter

ROOMS / LIFESTYLE adjectives:
- "studio", "bachelor", "single room": minRooms = 1
- "for a couple", "couple's flat": minRooms = 1
- "family home", "for a family", "family-sized": minRooms = 3
- "large family", "big family": minRooms = 4
- "one-bedroom", "1-bed": minRooms = 1
- "two-bedroom", "2-bed": minRooms = 2
- "three-bedroom", "3-bed": minRooms = 3

EXTRAS — populate the extras array when the user explicitly mentions any of these:
- "parking", "parking spot", "garage": add "parking"
- "storage", "storage unit", "trastero": add "storage unit"
- "terrace", "rooftop", "balcony": add "terrace"
- "air conditioning", "AC", "air con": add "air conditioning"
- "pool", "swimming pool": add "pool"
- "garden": add "garden"

COMBINED signals:
- "luxury penthouse" or "exclusive apartment": set minPrice as per luxury threshold, set hasElevator = true
- "cheap studio": maxPrice as per cheap threshold, minRooms = 1`;
}

export function parseFiltersFromResponse(text: string): ParsedFilters {
  const match = text.match(/<FILTERS>([\s\S]*?)<\/FILTERS>/);
  if (!match) return {};

  try {
    const raw = JSON.parse(match[1].trim());
    const filters: ParsedFilters = {};

    if (typeof raw.city === 'string') filters.city = raw.city;
    if (Array.isArray(raw.districts) && raw.districts.length > 0) filters.districts = raw.districts;
    if (Array.isArray(raw.neighborhoods) && raw.neighborhoods.length > 0) filters.neighborhoods = raw.neighborhoods;
    if (typeof raw.minPrice === 'number') filters.minPrice = raw.minPrice;
    if (typeof raw.maxPrice === 'number') filters.maxPrice = raw.maxPrice;
    if (typeof raw.minRooms === 'number') filters.minRooms = raw.minRooms;
    if (typeof raw.minArea === 'number') filters.minArea = raw.minArea;
    if (raw.hasElevator === true) filters.hasElevator = true;
    if (Array.isArray(raw.extras) && raw.extras.length > 0) filters.selectedExtras = raw.extras;

    return filters;
  } catch {
    return {};
  }
}
