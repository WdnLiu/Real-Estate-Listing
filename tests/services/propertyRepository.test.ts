import {
  saveProperty,
  saveProperties,
  findProperties,
  findPropertyById,
  createContactRequest,
  createOffer,
  clearAll,
  disconnect,
} from '../../src/services/propertyRepository';
import { ExtractedProperty } from '../../src/models/Property';

const BASE: ExtractedProperty = {
  listingType: 'rent',
  title: 'Test Flat',
  price: 1200,
  currency: 'EUR',
  areaSqm: 70,
  rooms: 2,
  bathrooms: 1,
  floor: 3,
  hasElevator: true,
  extras: ['parking'],
  location: { city: 'Barcelona', district: 'Eixample', neighborhood: 'La Sagrada Família', address: 'Carrer de Mallorca, 10' },
  description: 'A nice flat.',
  images: [],
};

function make(overrides: Partial<ExtractedProperty> = {}): ExtractedProperty {
  return { ...BASE, ...overrides };
}

beforeEach(async () => { await clearAll(); });
afterAll(async () => { await disconnect(); });

describe('saveProperty — deduplication', () => {
  it('saves a new property and returns true', async () => {
    const result = await saveProperty(make());
    expect(result).toBe(true);
  });

  it('returns false and does not duplicate when the same property is saved again', async () => {
    await saveProperty(make());
    const result = await saveProperty(make());
    expect(result).toBe(false);

    const { data } = await findProperties({}, 1, 100);
    expect(data).toHaveLength(1);
  });

  it('saves two properties that differ only in price as separate records', async () => {
    await saveProperty(make({ price: 1000 }));
    await saveProperty(make({ price: 1500 }));

    const { data } = await findProperties({}, 1, 100);
    expect(data).toHaveLength(2);
  });
});

describe('saveProperties — batch', () => {
  it('returns correct saved/skipped counts when a duplicate is present', async () => {
    await saveProperty(make({ price: 1000 }));

    const result = await saveProperties([
      make({ price: 1000 }),
      make({ price: 1500 }),
      make({ price: 2000 }),
    ]);

    expect(result).toEqual({ saved: 2, skipped: 1 });
  });
});

describe('findProperties — filters', () => {
  beforeEach(async () => {
    await saveProperties([
      make({ listingType: 'rent', price: 900, rooms: 1, areaSqm: 50, hasElevator: false, extras: [], location: { ...BASE.location, city: 'Barcelona', district: 'Gràcia' } }),
      make({ listingType: 'sale', price: 300000, rooms: 3, areaSqm: 100, hasElevator: true, extras: ['parking', 'terrace'], location: { ...BASE.location, city: 'Madrid', district: 'Salamanca' } }),
      make({ listingType: 'rent', price: 1400, rooms: 2, areaSqm: 75, hasElevator: true, extras: ['parking'], location: { ...BASE.location, city: 'Barcelona', district: 'Eixample' } }),
    ]);
  });

  it('returns all properties when no filters are set', async () => {
    const { data, total } = await findProperties({}, 1, 100);
    expect(total).toBe(3);
    expect(data).toHaveLength(3);
  });

  it('filters by listingType', async () => {
    const { total } = await findProperties({ listingType: 'rent' }, 1, 100);
    expect(total).toBe(2);
  });

  it('filters by city', async () => {
    const { total } = await findProperties({ city: 'Madrid' }, 1, 100);
    expect(total).toBe(1);
  });

  it('filters by multiple districts (OR)', async () => {
    const { total } = await findProperties({ districts: ['Gràcia', 'Eixample'] }, 1, 100);
    expect(total).toBe(2);
  });

  it('filters by minPrice and maxPrice', async () => {
    const { total } = await findProperties({ minPrice: 1000, maxPrice: 1500 }, 1, 100);
    expect(total).toBe(1);
  });

  it('filters by minRooms', async () => {
    const { total } = await findProperties({ minRooms: 3 }, 1, 100);
    expect(total).toBe(1);
  });

  it('filters by minArea', async () => {
    const { total } = await findProperties({ minArea: 75 }, 1, 100);
    expect(total).toBe(2);
  });

  it('filters by hasElevator', async () => {
    const { total } = await findProperties({ hasElevator: true }, 1, 100);
    expect(total).toBe(2);
  });

  it('filters by a single extra', async () => {
    const { total } = await findProperties({ selectedExtras: ['terrace'] }, 1, 100);
    expect(total).toBe(1);
  });

  it('filters by multiple extras (AND)', async () => {
    const { total } = await findProperties({ selectedExtras: ['parking', 'terrace'] }, 1, 100);
    expect(total).toBe(1);
  });

  it('paginates results', async () => {
    const page1 = await findProperties({}, 1, 2);
    const page2 = await findProperties({}, 2, 2);
    expect(page1.data).toHaveLength(2);
    expect(page2.data).toHaveLength(1);
    expect(page1.totalPages).toBe(2);
  });
});

describe('findPropertyById', () => {
  it('returns the property with its relations included', async () => {
    await saveProperty(make());
    const { data } = await findProperties({}, 1, 1);
    const id = (data[0] as { id: number }).id;

    const property = await findPropertyById(id) as Record<string, unknown>;
    expect(property).not.toBeNull();
    expect(property.title).toBe('Test Flat');
    expect(Array.isArray(property.extras)).toBe(true);
    expect(Array.isArray(property.images)).toBe(true);
  });

  it('returns null for an unknown id', async () => {
    expect(await findPropertyById(999999)).toBeNull();
  });
});

describe('createContactRequest / createOffer', () => {
  it('stores a contact request without throwing', async () => {
    await saveProperty(make());
    const { data } = await findProperties({}, 1, 1);
    const id = (data[0] as { id: number }).id;

    await expect(
      createContactRequest({ propertyId: id, name: 'Ana', email: 'ana@test.com', type: 'visit', message: 'Saturday morning?' })
    ).resolves.toBeUndefined();
  });

  it('stores an offer without throwing', async () => {
    await saveProperty(make());
    const { data } = await findProperties({}, 1, 1);
    const id = (data[0] as { id: number }).id;

    await expect(
      createOffer({ propertyId: id, name: 'Marc', email: 'marc@test.com', amount: 1100 })
    ).resolves.toBeUndefined();
  });
});
