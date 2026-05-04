import { ExtractedProperty, ExtractedPropertySchema, Location } from '../models/Property.js';
import { APARTMENT_IMAGE_URLS } from '../constants/apartmentImages.js';

type RawRecord = Record<string, unknown>;

function pickRandomImages(count = 2): string[] {
  const pool = [...APARTMENT_IMAGE_URLS];
  const result: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;

  const digits = value.replace(/[^\d.,]/g, '');
  if (!digits) return null;

  if (digits.includes(',')) return parseFloat(digits.replace(/\./g, '').replace(',', '.'));
  // European thousands separator: "1.850" means 1850
  if (/^\d{1,3}(\.\d{3})+$/.test(digits)) return parseFloat(digits.replace(/\./g, ''));

  return parseFloat(digits);
}

function parseArea(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const match = value.match(/[\d]+(?:[.,]\d+)?/);
  return match ? parseFloat(match[0].replace(',', '.')) : null;
}

function parseRooms(value: unknown): number | null {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value !== 'string') return null;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function isFotocasaPayload(raw: RawRecord): boolean {
  return 'priceInfo' in raw || 'multimedia' in raw || 'transaction' in raw;
}

function extractFotocasaLocation(raw: RawRecord): Location {
  const address = raw.address as RawRecord | undefined;
  const district = address?.district as RawRecord | undefined;
  const municipality = address?.municipality as RawRecord | undefined;
  const neighborhood = address?.neighborhood as RawRecord | undefined;

  return {
    city: typeof municipality?.name === 'string' ? municipality.name : '',
    district: typeof district?.name === 'string' ? district.name : undefined,
    neighborhood: typeof neighborhood?.name === 'string' ? neighborhood.name : undefined,
    address: typeof address?.name === 'string' ? address.name : '',
  };
}

function extractFotocasaExtras(features: RawRecord): string[] {
  const map: Record<string, string> = {
    hasParking: 'parking',
    hasStorageUnit: 'storage unit',
    hasTerrace: 'terrace',
    hasAirConditioning: 'air conditioning',
    hasPool: 'pool',
    hasGarden: 'garden',
  };
  return Object.entries(map)
    .filter(([key]) => features[key] === true)
    .map(([, label]) => label);
}

function extractFotocasaImages(raw: RawRecord): string[] {
  const multimedia = raw.multimedia as RawRecord | undefined;
  const images = (multimedia?.images as RawRecord[]) ?? [];
  return images.map((img) => img.url).filter((u): u is string => typeof u === 'string');
}

function normalizeFotocasa(raw: RawRecord): Partial<ExtractedProperty> {
  const priceInfo = raw.priceInfo as RawRecord | undefined;
  const features = (raw.features as RawRecord | undefined) ?? {};
  const detail = raw.detail as RawRecord | undefined;

  return {
    listingType: raw.transaction === 'rent' ? 'rent' : 'sale',
    title: typeof raw.title === 'string' ? raw.title : '',
    price: parsePrice(priceInfo?.amount ?? raw.price) ?? 0,
    currency: 'EUR',
    areaSqm: parseArea(features.constructedArea ?? raw.surface) ?? 0,
    rooms: parseRooms(features.roomsNumber ?? raw.rooms) ?? 0,
    bathrooms: typeof features.bathsNumber === 'number' ? features.bathsNumber : 1,
    floor: typeof features.floorNumber === 'number' ? features.floorNumber : undefined,
    hasElevator: features.hasElevator === true,
    extras: extractFotocasaExtras(features),
    location: extractFotocasaLocation(raw),
    description: typeof raw.description === 'string' ? raw.description : '',
    listingUrl: typeof detail?.url === 'string' ? detail.url : undefined,
    contactPhone: typeof raw.phone === 'string' ? raw.phone : undefined,
    images:
      extractFotocasaImages(raw).length > 0 ? extractFotocasaImages(raw) : pickRandomImages(2),
  };
}

function extractIdealistaLocation(raw: RawRecord): Location {
  const locationStr = typeof raw.location === 'string' ? raw.location : '';
  const [district, city] = locationStr.split(',').map((s) => s.trim());

  return {
    city: city || '',
    district: district || undefined,
    neighborhood: typeof raw.neighborhood === 'string' ? raw.neighborhood : undefined,
    address:
      typeof raw.address === 'string'
        ? raw.address
        : typeof (raw.address as RawRecord)?.name === 'string'
          ? ((raw.address as RawRecord).name as string)
          : '',
  };
}

function extractIdealistaExtrasAndFloor(raw: RawRecord): {
  extras: string[];
  floor: number | undefined;
  bathrooms: number;
  hasElevator: boolean;
} {
  const features = raw.features as Record<string, string[]> | undefined;
  const basics = features?.['Basic features'] ?? [];
  const amenities = features?.['Amenities'] ?? [];
  const building = features?.['Building'] ?? [];

  const hasElevator = building.some((s) => s.toLowerCase().includes('lift'));
  const extras: string[] = [];
  if (amenities.some((s) => s.toLowerCase().includes('parking'))) extras.push('parking');
  if (amenities.some((s) => s.toLowerCase().includes('storage'))) extras.push('storage unit');
  if (amenities.some((s) => s.toLowerCase().includes('pool'))) extras.push('pool');
  if (amenities.some((s) => s.toLowerCase().includes('garden'))) extras.push('garden');
  if (amenities.some((s) => s.toLowerCase().includes('terrace'))) extras.push('terrace');
  if (amenities.some((s) => s.toLowerCase().includes('air'))) extras.push('air conditioning');

  const floorStr = basics.find((s) => s.toLowerCase().includes('floor'));
  const floorMatch = floorStr?.match(/(\d+)/);
  const floor = floorMatch
    ? parseInt(floorMatch[1], 10)
    : floorStr?.toLowerCase().includes('ground')
      ? 0
      : undefined;

  const bathStr = basics.find((s) => s.includes('bathroom'));
  const bathrooms = bathStr ? parseInt(bathStr.match(/\d+/)?.[0] ?? '1', 10) : 1;

  return { extras, floor, bathrooms, hasElevator };
}

function extractIdealistaImages(raw: RawRecord): string[] {
  const imagesObj = raw.images as Record<string, string[]> | undefined;
  if (!imagesObj) return [];
  return Object.values(imagesObj)
    .flat()
    .filter((u): u is string => typeof u === 'string');
}

function extractIdealistaAreaAndRooms(raw: RawRecord): { areaSqm: number; rooms: number } {
  const features = raw.features as Record<string, string[]> | undefined;
  const basics = features?.['Basic features'] ?? [];

  return {
    areaSqm: parseArea(basics.find((s) => s.includes('m²'))) ?? 0,
    rooms: parseRooms(basics.find((s) => s.includes('bedroom'))) ?? 0,
  };
}

function normalizeIdealista(raw: RawRecord): Partial<ExtractedProperty> {
  const contactInfo = raw.contactInfo as RawRecord | undefined;
  const { areaSqm, rooms } = extractIdealistaAreaAndRooms(raw);
  const { extras, floor, bathrooms, hasElevator } = extractIdealistaExtrasAndFloor(raw);

  return {
    listingType: raw.operation === 'rent' ? 'rent' : 'sale',
    title: typeof raw.title === 'string' ? raw.title : '',
    price: parsePrice(raw.price) ?? 0,
    currency: 'EUR',
    areaSqm,
    rooms,
    bathrooms,
    floor,
    hasElevator,
    extras,
    location: extractIdealistaLocation(raw),
    description: typeof raw.description === 'string' ? raw.description : '',
    listingUrl: typeof raw.url === 'string' ? raw.url : undefined,
    contactPhone:
      typeof contactInfo?.contactPhone === 'string' ? contactInfo.contactPhone : undefined,
    images:
      extractIdealistaImages(raw).length > 0 ? extractIdealistaImages(raw) : pickRandomImages(2),
  };
}

export function normalizeProperty(raw: unknown): ExtractedProperty | null {
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as RawRecord;
  const partial = isFotocasaPayload(record)
    ? normalizeFotocasa(record)
    : normalizeIdealista(record);

  const result = ExtractedPropertySchema.safeParse(partial);
  return result.success ? result.data : null;
}

export function normalizeAll(raws: unknown[]): { data: ExtractedProperty[]; failures: number } {
  const data: ExtractedProperty[] = [];
  let failures = 0;

  for (const raw of raws) {
    const normalized = normalizeProperty(raw);
    normalized ? data.push(normalized) : failures++;
  }

  return { data, failures };
}
