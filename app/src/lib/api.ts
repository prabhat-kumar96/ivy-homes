// Ivy Homes API client
// FINDING: API key must be sent as X-API-Key header, NOT ?api_key= query param
// FINDING: auth response uses "access_token" not "token"
// FINDING: expires_in=900 (15min), not 86400 (24h) — need refresh token flow

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'IVY26-93596A43F3FA';

function getHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(token),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`${res.status}: ${err.detail || JSON.stringify(err)}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_url: string;
  user: { email: string };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export async function refreshToken(refreshTok: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ refresh_token: refreshTok }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  return res.json();
}

export async function logout(token: string): Promise<void> {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: getHeaders(token),
  }).catch(() => {});
}

// ── Listings ──────────────────────────────────────────────────────────────────

export interface Listing {
  listing_id: string;
  listing_url: string;
  website: string;
  city_id: number;
  apartment_name: string;
  locality: string;
  property_type: string;
  bedroom: number;
  bathroom: number;
  balcony: number;
  floor: number;
  total_floors: number;
  furnishing: string;
  facing_direction: string;
  covered_parking: number;
  price: number;
  carpet_area: number;
  super_built_up_area: number;
  latitude: number;
  longitude: number;
  posted_by: string;
  posted_by_name: string;
  posted_by_contact: string;
  project_id: string | null;
  is_verified: boolean;
  description: string;
  posted_at: string;  // FINDING: no Z suffix, local IST time
  is_live: boolean;   // FINDING: undocumented field
}

export interface PaginatedResponse<T> {
  total: number;
  offset?: number;
  limit?: number;
  count?: number;
  has_more?: boolean;
  page?: number;
  page_size?: number;
  results: T[];
}

export interface ListingFilters {
  page?: number;
  offset?: number;
  limit?: number;
  locality?: string;
  bhk?: number;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  furnishing?: string;
  sort_by?: string;
  order?: string;
}

export async function getListings(filters: ListingFilters = {}, token?: string): Promise<PaginatedResponse<Listing>> {
  const params = new URLSearchParams();
  const { page, limit = 20, offset, ...rest } = filters;
  const safeLimit = Math.min(limit, 50);
  const calculatedOffset = offset !== undefined ? offset : (page !== undefined ? (page - 1) * safeLimit : 0);
  params.set('offset', String(calculatedOffset));
  params.set('limit', String(safeLimit));
  Object.entries(rest).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  return apiFetch<PaginatedResponse<Listing>>(`/v1/listings?${params}`, {}, token);
}

export async function getListing(id: string, token?: string): Promise<Listing> {
  // FINDING: correct path is /v1/listings/{id}, not /v1/listing/{id} as documented
  return apiFetch<Listing>(`/v1/listings/${id}`, {}, token);
}

// ── Rentals ───────────────────────────────────────────────────────────────────

export interface Rental {
  listing_id: string;
  listing_url: string;
  website: string;
  city_id: number;
  title: string;
  apartment_name: string;
  locality: string;
  property_type: string;
  bedroom: number;
  bathroom: number;
  floor: number;
  total_floors: number;
  furnishing: string;
  facing_direction: string;
  price: number;  // monthly rent in rupees
  deposit: number;
  maintenance: number;
  carpet_area: number;
  super_builtup_area: number;  // NOTE: field name differs from listings (super_built_up_area)
  latitude: number;
  longitude: number;
  posted_by: string;
  posted_by_name: string;
  posted_by_contact: string;
  description: string;
  posted_at: string;
  is_live: boolean;
}

export interface RentalFilters {
  page?: number;
  offset?: number;
  limit?: number;
  locality?: string;
  bhk?: number;
  furnishing?: string;
  sort_by?: string;
  order?: string;
}

export async function getRentals(filters: RentalFilters = {}, token?: string): Promise<PaginatedResponse<Rental>> {
  const params = new URLSearchParams();
  const { page, limit = 20, offset, ...rest } = filters;
  const safeLimit = Math.min(limit, 50);
  const calculatedOffset = offset !== undefined ? offset : (page !== undefined ? (page - 1) * safeLimit : 0);
  params.set('offset', String(calculatedOffset));
  params.set('limit', String(safeLimit));
  Object.entries(rest).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  return apiFetch<PaginatedResponse<Rental>>(`/v1/rentals?${params}`, {}, token);
}

export async function getRental(id: string, token?: string): Promise<Rental> {
  return apiFetch<Rental>(`/v1/rentals/${id}`, {}, token);
}

// ── Projects ──────────────────────────────────────────────────────────────────

export interface Project {
  project_id: string;
  project_url: string;
  city_id: number;
  apartment_name: string;
  developer_name: string;
  locality: string;
  project_status: string;
  total_units: number;
  total_towers: number;
  total_floors: number;
  launch_date: string;
  possession_date: string;
  rera_number: string;
  min_area_sqft: number;
  max_area_sqft: number;
  total_listings: number;
  price_min: number;
  price_max: number;
  amenities: string[];
  latitude: number;
  longitude: number;
}

export interface ProjectFilters {
  page?: number;
  offset?: number;
  limit?: number;
  locality?: string;
  project_status?: string;
  sort_by?: string;
  order?: string;
}

export async function getProjects(filters: ProjectFilters = {}, token?: string): Promise<PaginatedResponse<Project>> {
  const params = new URLSearchParams();
  const { page, limit = 20, offset, ...rest } = filters;
  const safeLimit = Math.min(limit, 50);
  const calculatedOffset = offset !== undefined ? offset : (page !== undefined ? (page - 1) * safeLimit : 0);
  params.set('offset', String(calculatedOffset));
  params.set('limit', String(safeLimit));
  Object.entries(rest).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  return apiFetch<PaginatedResponse<Project>>(`/v1/projects?${params}`, {}, token);
}

export async function getProject(id: string, token?: string): Promise<Project> {
  return apiFetch<Project>(`/v1/projects/${id}`, {}, token);
}

// ── Favourites ────────────────────────────────────────────────────────────────

export interface FavouritesResponse {
  count: number;
  results: Listing[];
}

export async function getFavourites(token: string): Promise<FavouritesResponse> {
  return apiFetch<FavouritesResponse>('/v1/favourites', {}, token);
}

export async function addFavourite(listingId: string, token: string): Promise<void> {
  await apiFetch('/v1/favourites', {
    method: 'POST',
    body: JSON.stringify({ id: listingId }),
  }, token);
}

export async function removeFavourite(listingId: string, token: string): Promise<void> {
  await apiFetch(`/v1/favourites/${listingId}`, { method: 'DELETE' }, token);
}

// ── Utils ─────────────────────────────────────────────────────────────────────

export function formatPrice(price: number): string {
  if (price < 0) return `−₹${Math.abs(price).toLocaleString('en-IN')}`;
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

export function formatArea(sqft: number): string {
  return `${sqft.toLocaleString('en-IN')} sq.ft`;
}

export function formatDate(dateStr: string): string {
  // FINDING: posted_at has no Z suffix — treat as IST (no conversion needed)
  const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : '+05:30'));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}
