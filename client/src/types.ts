export interface Location {
  city: string;
  district?: string;
  neighborhood?: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface Property {
  id: number;
  listingType: 'rent' | 'sale';
  title: string;
  price: number;
  currency: string;
  areaSqm: number;
  rooms: number;
  bathrooms: number;
  floor: number | null;
  hasElevator: boolean;
  extras: string[];
  location: Location;
  description: string;
  listingUrl?: string;
  contactPhone?: string;
  images: { url: string; isPrimary: boolean; order: number }[];
}

export interface PaginatedResponse {
  data: Property[];
  total: number;
  page: number;
  totalPages: number;
}

export interface FilterState {
  city: string;
  districts: string[];
  neighborhoods: string[];
  minPrice: string;
  maxPrice: string;
  minRooms: string;
  minArea: string;
  hasElevator: boolean;
  selectedExtras: string[];
}
