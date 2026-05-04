import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeProperty, normalizeAll } from '../../src/services/normalizerService';

const fotocasaRaw = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/fotocasa_raw.json'), 'utf-8'),
);

describe('normalizeProperty — Fotocasa JSON', () => {
  let result: ReturnType<typeof normalizeProperty>;

  beforeAll(() => {
    result = normalizeProperty(fotocasaRaw);
  });

  it('returns a non-null result', () => {
    expect(result).not.toBeNull();
  });

  it('extracts listing type', () => {
    expect(result!.listingType).toBe('rent');
  });

  it('extracts price as a number', () => {
    expect(result!.price).toBe(1250);
  });

  it('extracts area, rooms and bathrooms', () => {
    expect(result!.areaSqm).toBe(85);
    expect(result!.rooms).toBe(3);
    expect(result!.bathrooms).toBe(2);
  });

  it('extracts floor and elevator as a first-class boolean', () => {
    expect(result!.floor).toBe(4);
    expect(result!.hasElevator).toBe(true);
  });

  it('maps extras from boolean feature flags', () => {
    expect(result!.extras).toContain('storage unit');
    expect(result!.extras).toContain('air conditioning');
    expect(result!.extras).not.toContain('parking');
    expect(result!.extras).not.toContain('elevator');
  });

  it('extracts the full location hierarchy', () => {
    expect(result!.location.city).toBe('Barcelona');
    expect(result!.location.district).toBe('Eixample');
    expect(result!.location.neighborhood).toBe('La Sagrada Família');
    expect(result!.location.address).toBe('Carrer de Provença, 312');
  });

  it('extracts contact and listing URL', () => {
    expect(result!.contactPhone).toBe('+34 612 345 678');
    expect(result!.listingUrl).toBe('https://fotocasa.es/listing/12345');
  });

  it('extracts images', () => {
    expect(result!.images).toHaveLength(2);
    expect(result!.images[0]).toBe('https://example.com/img/salon.jpg');
  });
});

describe('normalizeProperty — invalid payload', () => {
  it('returns null for an empty object', () => {
    expect(normalizeProperty({})).toBeNull();
  });

  it('returns null for null input', () => {
    expect(normalizeProperty(null)).toBeNull();
  });

  it('returns null for a primitive', () => {
    expect(normalizeProperty('not an object')).toBeNull();
  });
});

const IDEALISTA_FIXTURE = {
  url: 'https://idealista.com/inmueble/1',
  operation: 'rent',
  title: 'Piso luminoso en Gràcia',
  price: '1.200 €',
  location: 'Gràcia, Barcelona',
  neighborhood: 'Vila de Gràcia',
  address: { name: 'Carrer de Verdi, 10' },
  features: {
    'Basic features': ['75 m² built', '2 bedrooms', '1 bathroom', '3rd floor'],
    Building: ['With lift'],
    Amenities: ['Parking space'],
  },
  description: 'Piso luminoso.',
  images: {},
};

describe('normalizeProperty — Idealista JSON', () => {
  let result: ReturnType<typeof normalizeProperty>;

  beforeAll(() => {
    result = normalizeProperty(IDEALISTA_FIXTURE);
  });

  it('returns a non-null result', () => {
    expect(result).not.toBeNull();
  });

  it('extracts listingType as rent', () => {
    expect(result!.listingType).toBe('rent');
  });

  it('extracts price as a number', () => {
    expect(result!.price).toBe(1200);
  });

  it('extracts area and rooms', () => {
    expect(result!.areaSqm).toBe(75);
    expect(result!.rooms).toBe(2);
  });

  it('extracts hasElevator from Building features', () => {
    expect(result!.hasElevator).toBe(true);
  });

  it('extracts extras from Amenities', () => {
    expect(result!.extras).toContain('parking');
  });

  it('extracts location city and district from location string', () => {
    expect(result!.location.city).toBe('Barcelona');
    expect(result!.location.district).toBe('Gràcia');
  });

  it('extracts neighborhood from top-level field', () => {
    expect(result!.location.neighborhood).toBe('Vila de Gràcia');
  });

  it('extracts address from address.name object', () => {
    expect(result!.location.address).toBe('Carrer de Verdi, 10');
  });

  it('extracts floor from Basic features', () => {
    expect(result!.floor).toBe(3);
  });
});

describe('normalizeAll', () => {
  it('returns correct data and failure counts', () => {
    const { data, failures } = normalizeAll([IDEALISTA_FIXTURE, fotocasaRaw, {}]);
    expect(data).toHaveLength(2);
    expect(failures).toBe(1);
  });
});
