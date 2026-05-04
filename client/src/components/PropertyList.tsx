import { useState, useEffect } from 'react';
import { Property, FilterState, PaginatedResponse } from '../types';
import PropertyCard from './PropertyCard';

const PAGE_SIZE = 12;

interface Props {
  listingType: 'rent' | 'sale';
  filters: FilterState;
  onSelect: (id: number) => void;
  onResultCount?: (count: number) => void;
}

function buildQuery(listingType: string, filters: FilterState, page: number): string {
  const params = new URLSearchParams({ listingType, page: String(page), limit: String(PAGE_SIZE) });
  if (filters.city) params.set('city', filters.city);
  if (filters.districts.length) params.set('district', filters.districts.join(','));
  if (filters.neighborhoods.length) params.set('neighborhood', filters.neighborhoods.join(','));
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.minRooms) params.set('minRooms', filters.minRooms);
  if (filters.minArea) params.set('minArea', filters.minArea);
  if (filters.hasElevator) params.set('hasElevator', 'true');
  if (filters.selectedExtras.length) params.set('extras', filters.selectedExtras.join(','));
  return `/api/properties?${params.toString()}`;
}

export default function PropertyList({ listingType, filters, onSelect, onResultCount }: Props) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [listingType, filters]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(buildQuery(listingType, filters, page), { signal: controller.signal })
      .then((r) => r.json() as Promise<PaginatedResponse>)
      .then(({ data, total, totalPages }) => {
        setProperties(data);
        setTotalPages(totalPages);
        onResultCount?.(total);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError('Failed to load listings.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [listingType, filters, page]);

  if (loading) return <p className="empty">Loading…</p>;
  if (error) return <p className="empty">{error}</p>;
  if (properties.length === 0) return <p className="empty">No listings match your filters.</p>;

  return (
    <>
      <div className="property-grid">
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} onSelect={onSelect} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            ‹ Prev
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
            Next ›
          </button>
        </div>
      )}
    </>
  );
}
