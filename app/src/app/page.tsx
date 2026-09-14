'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getListings, addFavourite, removeFavourite, getFavourites, type Listing, type ListingFilters } from '@/lib/api';
import { ListingCard } from '@/components/ListingCard';
import { FilterBar } from '@/components/FilterBar';

// FINDING: max page_size is 50 (API ignores limit > 50)
const PAGE_SIZE = 20;

export default function HomePage() {
  const { token, refreshIfNeeded, session } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [displayedListings, setDisplayedListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string | number | undefined>>({});
  const [clientFilters, setClientFilters] = useState<Record<string, string | number | undefined>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState('');
  const [order, setOrder] = useState('asc');

  // Load saved listings
  const loadSaved = useCallback(async () => {
    if (!session) return;
    const t = await refreshIfNeeded();
    if (!t) return;
    try {
      const favs = await getFavourites(t);
      setSavedIds(new Set(favs.results.map(l => l.listing_id)));
    } catch {
      // Favourites endpoint may not exist, ignore
    }
  }, [session, refreshIfNeeded]);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const fetchListings = useCallback(async (pg: number, serverFilters: ListingFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const t = await refreshIfNeeded();
      const result = await getListings({ ...serverFilters, page: pg, limit: PAGE_SIZE }, t || undefined);
      if (pg === 1) {
        setListings(result.results);
      } else {
        setListings(prev => [...prev, ...result.results]);
      }
      setTotal(result.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  }, [refreshIfNeeded]);

  useEffect(() => {
    const serverFilters: ListingFilters = {};
    // Server-supported filters
    if (filters.locality) serverFilters.locality = String(filters.locality);
    if (filters.bhk) serverFilters.bhk = Number(filters.bhk);
    if (filters.property_type) serverFilters.property_type = String(filters.property_type);
    if (filters.furnishing) serverFilters.furnishing = String(filters.furnishing);
    if (filters.min_price) serverFilters.min_price = Number(filters.min_price);
    if (filters.max_price) serverFilters.max_price = Number(filters.max_price);
    // FINDING: sort_by and order don't actually sort — but we still send them
    // and apply client-side sort as a workaround
    if (sortBy) serverFilters.sort_by = sortBy;
    serverFilters.order = order;

    // Store remaining for client-side filtering (in case server ignores any params)
    setClientFilters({
      min_price: filters.min_price,
      max_price: filters.max_price,
    });

    setPage(1);
    fetchListings(1, serverFilters);
  }, [filters, sortBy, order, fetchListings]);

  // Apply client-side filtering and sorting (insurance against server ignoring params)
  useEffect(() => {
    let result = [...listings];

    // Client-side price filtering (insurance)
    if (clientFilters.min_price) result = result.filter(l => l.price >= Number(clientFilters.min_price));
    if (clientFilters.max_price) result = result.filter(l => l.price <= Number(clientFilters.max_price));

    // Client-side sort (since server sort is broken)
    if (sortBy) {
      result.sort((a, b) => {
        const av = a[sortBy as keyof Listing] as number;
        const bv = b[sortBy as keyof Listing] as number;
        if (typeof av !== 'number' || typeof bv !== 'number') return 0;
        return order === 'asc' ? av - bv : bv - av;
      });
    }

    setDisplayedListings(result);
  }, [listings, clientFilters, sortBy, order]);

  const handleSaveToggle = async (id: string, isSaved: boolean) => {
    const t = await refreshIfNeeded();
    if (!t) { alert('Please log in to save listings'); return; }
    try {
      if (isSaved) {
        await removeFavourite(id, t);
        setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      } else {
        await addFavourite(id, t);
        setSavedIds(prev => new Set([...prev, id]));
      }
    } catch (e: unknown) {
      console.error('Save toggle failed:', e);
    }
  };

  const handleFilterChange = (newFilters: Record<string, string | number | undefined>) => {
    setFilters(newFilters);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    const serverFilters: ListingFilters = {};
    if (filters.locality) serverFilters.locality = String(filters.locality);
    if (filters.bhk) serverFilters.bhk = Number(filters.bhk);
    if (filters.property_type) serverFilters.property_type = String(filters.property_type);
    if (filters.furnishing) serverFilters.furnishing = String(filters.furnishing);
    if (filters.min_price) serverFilters.min_price = Number(filters.min_price);
    if (filters.max_price) serverFilters.max_price = Number(filters.max_price);
    if (sortBy) serverFilters.sort_by = sortBy;
    serverFilters.order = order;
    fetchListings(nextPage, serverFilters);
  };

  const hasMore = listings.length < total;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mumbai Listings</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{total.toLocaleString('en-IN')} total</span>
        </div>
      </div>

      <FilterBar onFilter={handleFilterChange} initialFilters={filters} />

      {/* Sort bar */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">Sort by:</span>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Default</option>
          <option value="price">Price</option>
          <option value="carpet_area">Area</option>
          <option value="bedroom">Bedrooms</option>
        </select>
        <select
          value={order}
          onChange={e => setOrder(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="asc">Low → High</option>
          <option value="desc">High → Low</option>
        </select>
        {sortBy && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">⚠ Sorted client-side (server sort broken)</span>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {isLoading && listings.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-52 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedListings.map(listing => (
              <ListingCard
                key={listing.listing_id}
                listing={listing}
                isSaved={savedIds.has(listing.listing_id)}
                onSaveToggle={session ? handleSaveToggle : undefined}
              />
            ))}
          </div>

          {displayedListings.length === 0 && !isLoading && (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg">No listings found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}

          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Loading...' : `Load More (${total - listings.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
