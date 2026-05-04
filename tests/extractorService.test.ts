import { extract } from '../src/services/extractorService';

jest.mock('../src/services/llmExtractorService');

import { extractFromHtml, extractFromJson } from '../src/services/llmExtractorService';

const mockExtractHtml = extractFromHtml as jest.Mock;
const mockExtractJson = extractFromJson as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockExtractHtml.mockResolvedValue(null);
  mockExtractJson.mockResolvedValue(null);
});

describe('extractor factory', () => {
  it('routes a plain object to the JSON extractor', async () => {
    const input = { transaction: 'rent', title: 'Test flat' };
    await extract(input);

    expect(mockExtractJson).toHaveBeenCalledTimes(1);
    expect(mockExtractJson).toHaveBeenCalledWith(input);
    expect(mockExtractHtml).not.toHaveBeenCalled();
  });

  it('routes an HTML string to the HTML extractor', async () => {
    const html = '<html><body>Flat for rent</body></html>';
    await extract(html);

    expect(mockExtractHtml).toHaveBeenCalledTimes(1);
    expect(mockExtractHtml).toHaveBeenCalledWith(html);
    expect(mockExtractJson).not.toHaveBeenCalled();
  });

  it('routes a string starting with a tag (no doctype) to the HTML extractor', async () => {
    await extract('<div class="listing">Flat 1200€</div>');

    expect(mockExtractHtml).toHaveBeenCalledTimes(1);
    expect(mockExtractJson).not.toHaveBeenCalled();
  });

  it('returns whatever the JSON extractor returns for object input', async () => {
    const property = { listingType: 'rent', title: 'Flat' };
    mockExtractJson.mockResolvedValue(property);

    const result = await extract({ title: 'Flat' });
    expect(result).toBe(property);
  });

  it('returns whatever the HTML extractor returns for HTML input', async () => {
    const property = { listingType: 'sale', title: 'House' };
    mockExtractHtml.mockResolvedValue(property);

    const result = await extract('<html><body>House for sale</body></html>');
    expect(result).toBe(property);
  });
});
