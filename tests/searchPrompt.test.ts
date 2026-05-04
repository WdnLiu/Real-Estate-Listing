import { buildSystemPrompt, parseFiltersFromResponse } from '../src/lib/searchPrompt';

describe('buildSystemPrompt', () => {
  it('contains known city names from CITY_LOCATIONS', () => {
    const prompt = buildSystemPrompt('rent');
    expect(prompt).toContain('Barcelona');
    expect(prompt).toContain('Madrid');
  });

  it('mentions monthly price for rent listings', () => {
    expect(buildSystemPrompt('rent')).toContain('monthly €');
  });

  it('mentions total price for sale listings', () => {
    expect(buildSystemPrompt('sale')).toContain('total €');
  });

  it('sets cheap maxPrice to 900 for rent', () => {
    expect(buildSystemPrompt('rent')).toContain('maxPrice = 900');
  });

  it('sets cheap maxPrice to 250000 for sale', () => {
    expect(buildSystemPrompt('sale')).toContain('maxPrice = 250000');
  });

  it('sets moderate maxPrice to 1400 for rent', () => {
    expect(buildSystemPrompt('rent')).toContain('maxPrice = 1400');
  });

  it('sets moderate maxPrice to 400000 for sale', () => {
    expect(buildSystemPrompt('sale')).toContain('maxPrice = 400000');
  });
});

describe('parseFiltersFromResponse', () => {
  it('parses a complete FILTERS block', () => {
    const text = `Sure, here are properties in Eixample.
<FILTERS>
{
  "city": "Barcelona",
  "districts": ["Eixample"],
  "neighborhoods": ["La Sagrada Família"],
  "minPrice": 800,
  "maxPrice": 1400,
  "minRooms": 2,
  "minArea": 60,
  "hasElevator": true,
  "extras": ["parking"]
}
</FILTERS>`;
    const filters = parseFiltersFromResponse(text);
    expect(filters.city).toBe('Barcelona');
    expect(filters.districts).toEqual(['Eixample']);
    expect(filters.neighborhoods).toEqual(['La Sagrada Família']);
    expect(filters.minPrice).toBe(800);
    expect(filters.maxPrice).toBe(1400);
    expect(filters.minRooms).toBe(2);
    expect(filters.minArea).toBe(60);
    expect(filters.hasElevator).toBe(true);
    expect(filters.selectedExtras).toEqual(['parking']);
  });

  it('maps extras array to selectedExtras', () => {
    const text = `<FILTERS>{"city": null, "districts": [], "neighborhoods": [], "minPrice": null, "maxPrice": null, "minRooms": null, "minArea": null, "hasElevator": null, "extras": ["terrace", "pool"]}</FILTERS>`;
    const filters = parseFiltersFromResponse(text);
    expect(filters.selectedExtras).toEqual(['terrace', 'pool']);
  });

  it('omits fields set to null in the JSON', () => {
    const text = `<FILTERS>{"city": null, "districts": [], "neighborhoods": [], "minPrice": null, "maxPrice": null, "minRooms": null, "minArea": null, "hasElevator": null, "extras": []}</FILTERS>`;
    const filters = parseFiltersFromResponse(text);
    expect(filters.city).toBeUndefined();
    expect(filters.minPrice).toBeUndefined();
    expect(filters.hasElevator).toBeUndefined();
    expect(filters.selectedExtras).toBeUndefined();
  });

  it('returns {} when no FILTERS block is present', () => {
    expect(parseFiltersFromResponse('Just a plain response with no filters.')).toEqual({});
  });

  it('returns {} when the FILTERS block contains malformed JSON', () => {
    expect(parseFiltersFromResponse('<FILTERS>{ not valid json }</FILTERS>')).toEqual({});
  });

  it('handles partial filters (only city)', () => {
    const text = `<FILTERS>{"city": "Madrid", "districts": [], "neighborhoods": [], "minPrice": null, "maxPrice": null, "minRooms": null, "minArea": null, "hasElevator": null, "extras": []}</FILTERS>`;
    const filters = parseFiltersFromResponse(text);
    expect(filters.city).toBe('Madrid');
    expect(Object.keys(filters)).toEqual(['city']);
  });
});
