import { useState, useEffect } from 'react';
import { FilterState } from './types';
import Filters from './components/Filters';
import PropertyList from './components/PropertyList';
import PropertyDetail from './components/PropertyDetail';
import AISearch from './components/AISearch';

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

function getInitialTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [tab, setTab] = useState<'rent' | 'sale'>('rent');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [resultCount, setResultCount] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  function mergeFilters(partial: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="app">
      <header>
        <h1 onClick={() => setSelectedId(null)} style={{ cursor: 'pointer' }}>
          Real Estate Listings
        </h1>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </header>

      {selectedId !== null ? (
        <PropertyDetail id={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <>
          <div className="tabs">
            <button
              className={`tab ${tab === 'rent' ? 'active' : ''}`}
              onClick={() => setTab('rent')}
            >
              For Rent
            </button>
            <button
              className={`tab ${tab === 'sale' ? 'active' : ''}`}
              onClick={() => setTab('sale')}
            >
              For Sale
            </button>
          </div>
          <AISearch listingType={tab} onFiltersApplied={mergeFilters} resultCount={resultCount} />
          <Filters filters={filters} onChange={setFilters} />
          <PropertyList
            listingType={tab}
            filters={filters}
            onSelect={setSelectedId}
            onResultCount={setResultCount}
          />
        </>
      )}
    </div>
  );
}
