import { createHash } from 'crypto';
import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { ExtractedProperty } from '../models/Property.js';

function hashProperty(p: ExtractedProperty): string {
  const fingerprint = {
    listingType: p.listingType,
    price: p.price,
    areaSqm: p.areaSqm,
    rooms: p.rooms,
    bathrooms: p.bathrooms,
    floor: p.floor ?? null,
    hasElevator: p.hasElevator,
    extras: [...p.extras].sort(),
    city: p.location.city,
    district: p.location.district ?? null,
    neighborhood: p.location.neighborhood ?? null,
    address: p.location.address,
  };
  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
}

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

export interface PropertyFilters {
  listingType?: 'rent' | 'sale';
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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

function buildWhereClause(filters: PropertyFilters) {
  return {
    ...(filters.listingType && { listingType: filters.listingType }),
    ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
      ? { price: { gte: filters.minPrice, lte: filters.maxPrice } }
      : {}),
    ...(filters.minRooms !== undefined && { rooms: { gte: filters.minRooms } }),
    ...(filters.minArea !== undefined && { areaSqm: { gte: filters.minArea } }),
    ...(filters.hasElevator === true && { hasElevator: true }),
    ...(filters.selectedExtras?.length && {
      AND: filters.selectedExtras.map((e) => ({ extras: { some: { name: e } } })),
    }),
    location: {
      ...(filters.city && { city: { contains: filters.city } }),
      ...(filters.districts?.length && { district: { in: filters.districts } }),
      ...(filters.neighborhoods?.length && { neighborhood: { in: filters.neighborhoods } }),
    },
  };
}

const propertyInclude = {
  location: true,
  extras: true,
  images: { orderBy: { order: 'asc' as const } },
};

export async function findProperties(
  filters: PropertyFilters,
  page: number,
  limit: number,
): Promise<PaginatedResult<object>> {
  const where = buildWhereClause(filters);
  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: propertyInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.property.count({ where }),
  ]);

  return { data: rows, total, page, totalPages: Math.ceil(total / limit) };
}

export async function findPropertyById(id: number): Promise<object | null> {
  return prisma.property.findUnique({ where: { id }, include: propertyInclude });
}

export async function saveProperty(property: ExtractedProperty): Promise<boolean> {
  const contentHash = hashProperty(property);
  const existing = await prisma.property.findUnique({ where: { contentHash } });
  if (existing) return false;

  await prisma.property.create({
    data: {
      listingType: property.listingType,
      title: property.title,
      price: property.price,
      currency: property.currency,
      areaSqm: property.areaSqm,
      rooms: property.rooms,
      bathrooms: property.bathrooms,
      floor: property.floor,
      hasElevator: property.hasElevator,
      contentHash,
      extras: {
        create: property.extras.map((name) => ({ name })),
      },
      description: property.description,
      listingUrl: property.listingUrl,
      contactPhone: property.contactPhone,
      location: {
        create: {
          city: property.location.city,
          district: property.location.district,
          neighborhood: property.location.neighborhood,
          address: property.location.address,
        },
      },
      images: {
        create: property.images.map((url, index) => ({
          url,
          isPrimary: index === 0,
          order: index,
        })),
      },
    },
  });
  return true;
}

export async function saveProperties(properties: ExtractedProperty[]): Promise<{ saved: number; skipped: number }> {
  let saved = 0;
  let skipped = 0;
  for (const property of properties) {
    (await saveProperty(property)) ? saved++ : skipped++;
  }
  return { saved, skipped };
}

export interface ContactRequestInput {
  propertyId: number;
  name: string;
  email: string;
  type: string;
  message?: string;
  visitDate?: string;
}

export interface OfferInput {
  propertyId: number;
  name: string;
  email: string;
  amount: number;
  note?: string;
}

export async function createContactRequest(input: ContactRequestInput): Promise<void> {
  await prisma.contactRequest.create({ data: input });
}

export async function createOffer(input: OfferInput): Promise<void> {
  await prisma.offer.create({ data: input });
}

export async function clearAll(): Promise<void> {
  await prisma.extra.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.contactRequest.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.property.deleteMany();
  await prisma.location.deleteMany();
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
