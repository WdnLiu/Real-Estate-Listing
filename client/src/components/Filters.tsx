import { useState, useRef, useEffect } from 'react';
import { FilterState } from '../types';
import { CITIES, CITY_LOCATIONS, DISTRICT_NEIGHBORHOODS } from '../constants/locations';

const EXTRAS = ['parking', 'storage unit', 'terrace', 'air conditioning', 'pool', 'garden'];

const EMPTY_FILTERS: FilterState = {
  city: '',
  districts: [],
  neighborhoods: [],
  minPrice: '',
  maxPrice: '',
  minRooms: '',
  minArea: '',
  hasElevator: false,
  selectedExtras: [],
};

function hasActiveFilters(f: FilterState): boolean {
  return !!(
    f.city ||
    f.districts.length ||
    f.neighborhoods.length ||
    f.minPrice ||
    f.maxPrice ||
    f.minRooms ||
    f.minArea ||
    f.hasElevator ||
    f.selectedExtras.length
  );
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

interface DropdownProps {
  label: string;
  badge?: number;
  disabled?: boolean;
  children: React.ReactNode;
}

function FilterDropdown({ label, badge, disabled, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div
      className={`filter-dropdown ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
      ref={ref}
    >
      <button
        className="filter-dropdown-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        type="button"
        disabled={disabled}
      >
        <span>{label}</span>
        {badge ? <span className="filter-dropdown-badge">{badge}</span> : null}
        <span className="filter-dropdown-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="filter-dropdown-panel">{children}</div>}
    </div>
  );
}

export default function Filters({ filters, onChange }: Props) {
  const set = (field: keyof FilterState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...filters, [field]: e.target.value });

  const setCity = (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...filters, city: e.target.value, districts: [], neighborhoods: [] });

  const toggleDistrict = (d: string) => {
    const newDistricts = toggleItem(filters.districts, d);
    const validNeighborhoods = newDistricts.flatMap((dist) => DISTRICT_NEIGHBORHOODS[dist] ?? []);
    const newNeighborhoods = filters.neighborhoods.filter((n) => validNeighborhoods.includes(n));
    onChange({ ...filters, districts: newDistricts, neighborhoods: newNeighborhoods });
  };

  const toggleNeighborhood = (n: string) =>
    onChange({ ...filters, neighborhoods: toggleItem(filters.neighborhoods, n) });

  const toggleExtra = (e: string) =>
    onChange({ ...filters, selectedExtras: toggleItem(filters.selectedExtras, e) });

  const cityLocations = CITY_LOCATIONS[filters.city];

  const availableNeighborhoods = filters.districts.length
    ? filters.districts.flatMap((d) => DISTRICT_NEIGHBORHOODS[d] ?? [])
    : (cityLocations?.neighborhoods ?? []);

  const featureBadge = (filters.hasElevator ? 1 : 0) + filters.selectedExtras.length || undefined;

  return (
    <div className="filters-wrap">
      <div className="filters-inputs">
        {hasActiveFilters(filters) && (
          <button className="filters-clear" type="button" onClick={() => onChange(EMPTY_FILTERS)}>
            Clear filters
          </button>
        )}
        <input placeholder="City" value={filters.city} onChange={setCity} list="cities-list" />
        <datalist id="cities-list">
          {CITIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          placeholder="Min price"
          type="number"
          value={filters.minPrice}
          onChange={set('minPrice')}
        />
        <input
          placeholder="Max price"
          type="number"
          value={filters.maxPrice}
          onChange={set('maxPrice')}
        />
        <input
          placeholder="Min rooms"
          type="number"
          value={filters.minRooms}
          onChange={set('minRooms')}
        />
        <input
          placeholder="Min area (m²)"
          type="number"
          value={filters.minArea}
          onChange={set('minArea')}
        />
      </div>

      <div className="filters-dropdowns">
        {cityLocations && (
          <>
            <FilterDropdown label="Districts" badge={filters.districts.length || undefined}>
              <div className="checkbox-list">
                {cityLocations.districts.map((d) => (
                  <label key={d} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={filters.districts.includes(d)}
                      onChange={() => toggleDistrict(d)}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </FilterDropdown>

            {filters.districts.length === 0 ? (
              <FilterDropdown label="Neighborhoods" disabled>
                <p className="dropdown-empty-hint">Select a district first</p>
              </FilterDropdown>
            ) : availableNeighborhoods.length > 0 ? (
              <FilterDropdown
                label="Neighborhoods"
                badge={filters.neighborhoods.length || undefined}
              >
                <div className="checkbox-list">
                  {availableNeighborhoods.map((n) => (
                    <label key={n} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={filters.neighborhoods.includes(n)}
                        onChange={() => toggleNeighborhood(n)}
                      />
                      {n}
                    </label>
                  ))}
                </div>
              </FilterDropdown>
            ) : null}
          </>
        )}

        <FilterDropdown label="Features" badge={featureBadge}>
          <div className="checkbox-list">
            <label className="checkbox-item checkbox-item-highlight">
              <input
                type="checkbox"
                checked={filters.hasElevator}
                onChange={(e) => onChange({ ...filters, hasElevator: e.target.checked })}
              />
              Elevator required
            </label>
            <div className="checkbox-divider" />
            {EXTRAS.map((e) => (
              <label key={e} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={filters.selectedExtras.includes(e)}
                  onChange={() => toggleExtra(e)}
                />
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </label>
            ))}
          </div>
        </FilterDropdown>
      </div>
    </div>
  );
}
