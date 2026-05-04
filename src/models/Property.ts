import { z } from 'zod';

export const LocationSchema = z.object({
  city: z.string().min(1),
  district: z.string().optional(),
  neighborhood: z.string().optional(),
  address: z.string().min(1),
});

export const ExtractedPropertySchema = z.object({
  listingType: z.enum(['rent', 'sale']),
  title: z.string().min(1),
  price: z.number(),
  currency: z.string().default('EUR'),
  areaSqm: z.number(),
  rooms: z.number().int(),
  bathrooms: z.number().int().min(1).default(1),
  floor: z.number().int().optional(),
  hasElevator: z.boolean().default(false),
  extras: z.array(z.string()).default([]),
  location: LocationSchema,
  description: z.string(),
  listingUrl: z.string().optional(),
  contactPhone: z.string().optional(),
  images: z.array(z.string()).default([]),
});

export type Location = z.infer<typeof LocationSchema>;
export type ExtractedProperty = z.infer<typeof ExtractedPropertySchema>;
