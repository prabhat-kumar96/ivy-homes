'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getListings, addFavourite, removeFavourite, getFavourites, type Listing, type ListingFilters } from '@/lib/api';
import { ListingCard } from '@/components/ListingCard';
import { FilterBar } from '@/components/FilterBar';
import Link from 'next/link';

const PAGE_SIZE = 24;

export default function HomePage() {
  const { token, refreshIfNeeded, session, isLoading: authLoading, switchAccount } = useAuth();
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
      // Handled via local fallback in api.ts
    }
  }, [session, refreshIfNeeded]);

  useEffect(() => {
    if (session) loadSaved();
  }, [session, loadSaved]);

  const fetchListings = useCallback(async (pg: number, serverFilters: ListingFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const t = await refreshIfNeeded();
      if (!t) return; // Do not fetch without valid token
      const result = await getListings({ ...serverFilters, page: pg, limit: PAGE_SIZE }, t);
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
    if (!token) return; // Wait until token is available
    const serverFilters: ListingFilters = {};
    if (filters.locality) serverFilters.locality = String(filters.locality);
    if (filters.bhk) serverFilters.bhk = Number(filters.bhk);
    if (filters.property_type) serverFilters.property_type = String(filters.property_type);
    if (filters.furnishing) serverFilters.furnishing = String(filters.furnishing);
    if (filters.min_price) serverFilters.min_price = Number(filters.min_price);
    if (filters.max_price) serverFilters.max_price = Number(filters.max_price);
    if (sortBy) serverFilters.sort_by = sortBy;
    serverFilters.order = order;

    setClientFilters({ ...filters });
    setPage(1);
    fetchListings(1, serverFilters);
  }, [filters, sortBy, order, token, fetchListings]);

  // Client-side filtering & sorting defense
  useEffect(() => {
    let result = [...listings];

    if (clientFilters.locality) {
      const loc = String(clientFilters.locality).toLowerCase().trim();
      result = result.filter(l => (l.locality || '').toLowerCase().includes(loc));
    }
    if (clientFilters.bhk !== undefined && clientFilters.bhk !== '') {
      result = result.filter(l => l.bedroom === Number(clientFilters.bhk));
    }
    if (clientFilters.property_type) {
      result = result.filter(l => (l.property_type || '').toLowerCase() === String(clientFilters.property_type).toLowerCase());
    }
    if (clientFilters.furnishing) {
      result = result.filter(l => (l.furnishing || '').toLowerCase() === String(clientFilters.furnishing).toLowerCase());
    }
    if (clientFilters.min_price) {
      result = result.filter(l => l.price >= Number(clientFilters.min_price));
    }
    if (clientFilters.max_price) {
      result = result.filter(l => l.price <= Number(clientFilters.max_price));
    }

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
    if (!t) return;
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

  // Render loading skeleton during initial auth check
  if (authLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto py-8">
        <div className="h-10 bg-slate-200 rounded-xl w-64 animate-pulse" />
        <div className="h-36 bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // If user explicitly signed out, show clean login selection
  if (!session) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Welcome to Ivy Homes Mumbai
          </h1>
          <p className="text-slate-600 max-w-lg mx-auto text-sm sm:text-base">
            Select an account to start browsing verified properties:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
          {[
            { email: 'demo1@ivy.homes', label: 'Demo Account 1' },
            { email: 'demo2@ivy.homes', label: 'Demo Account 2' },
            { email: 'demo3@ivy.homes', label: 'Demo Account 3' },
          ].map(account => (
            <button
              key={account.email}
              onClick={() => switchAccount(account.email)}
              className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 hover:ring-2 hover:ring-blue-500/10 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 flex items-center justify-center font-bold text-lg mb-3 transition-colors">
                👤
              </div>
              <p className="font-bold text-slate-900 text-sm">{account.label}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{account.email}</p>
              <div className="mt-4 text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
                <span>Sign In</span> →
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          Or sign in manually at the <Link href="/login" className="text-blue-600 underline font-semibold">Login Page</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mumbai Properties</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Verified property listings, rentals, and development projects in Mumbai
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            {total.toLocaleString('en-IN')} Available
          </span>
          <span className="inline-flex items-center bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700">
            4,017 Active
          </span>
        </div>
      </div>

      {/* Filter Component */}
      <FilterBar onFilter={handleFilterChange} initialFilters={filters} />

      {/* Controls: Sorting & Result Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort by:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Default Order</option>
            <option value="price">Price</option>
            <option value="carpet_area">Carpet Area</option>
            <option value="bedroom">Bedrooms</option>
          </select>
          <select
            value={order}
            onChange={e => setOrder(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="asc">Low → High</option>
            <option value="desc">High → Low</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{displayedListings.length}</span> of {total.toLocaleString('en-IN')} properties
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700 text-sm flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold">Error loading listings</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Listings Grid */}
      {isLoading && listings.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedListings.map(listing => (
              <ListingCard
                key={listing.listing_id}
                listing={listing}
                isSaved={savedIds.has(listing.listing_id)}
                onSaveToggle={handleSaveToggle}
              />
            ))}
          </div>

          {displayedListings.length === 0 && !isLoading && (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
              <div className="text-4xl">🔍</div>
              <h3 className="text-lg font-bold text-slate-800">No properties match your filter</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Try expanding your price range or clearing specific filters to see more results.
              </p>
            </div>
          )}

          {hasMore && (
            <div className="text-center pt-6 pb-4">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
              >
                {isLoading ? 'Loading more...' : `Load More Listings (${total - listings.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
