'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRentals, formatPrice, formatArea, formatDate, type Rental, type RentalFilters } from '@/lib/api';

const PAGE_SIZE = 20;

export default function RentalsPage() {
  const { refreshIfNeeded } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locality, setLocality] = useState('');
  const [bhk, setBhk] = useState('');
  const [furnishing, setFurnishing] = useState('');

  const fetchRentals = useCallback(async (pg: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const t = await refreshIfNeeded();
      const filters: RentalFilters = { page: pg, limit: PAGE_SIZE };
      if (locality) filters.locality = locality;
      if (bhk) filters.bhk = parseInt(bhk);
      if (furnishing) filters.furnishing = furnishing;
      const result = await getRentals(filters, t || undefined);
      if (pg === 1) {
        setRentals(result.results);
      } else {
        setRentals(prev => [...prev, ...result.results]);
      }
      setTotal(result.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load rentals');
    } finally {
      setIsLoading(false);
    }
  }, [refreshIfNeeded, locality, bhk, furnishing]);

  useEffect(() => {
    setPage(1);
    fetchRentals(1);
  }, [locality, bhk, furnishing]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchRentals(next);
  };

  const hasMore = rentals.length < total;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mumbai Rentals</h1>
        <span className="text-sm text-gray-500">{total.toLocaleString('en-IN')} total</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Locality</label>
            <input
              type="text"
              value={locality}
              onChange={e => setLocality(e.target.value)}
              placeholder="e.g. mulund west"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">BHK</label>
            <select value={bhk} onChange={e => setBhk(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Any</option>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} BHK</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Furnishing</label>
            <select value={furnishing} onChange={e => setFurnishing(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Any</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="semi-furnished">Semi-furnished</option>
              <option value="fully-furnished">Fully-furnished</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setLocality(''); setBhk(''); setFurnishing(''); }} className="w-full bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-200">Reset</button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rentals.map(rental => (
          <div key={rental.listing_id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide truncate">{rental.locality}</p>
              <h3 className="font-semibold text-gray-800 text-sm leading-tight mt-0.5 truncate">{rental.apartment_name}</h3>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-baseline justify-between">
                {/* price is monthly rent in rupees — verified from API */}
                <span className="text-lg font-bold text-gray-900">{formatPrice(rental.price)}/mo</span>
                <span className="text-xs text-gray-500">{formatArea(rental.carpet_area)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>🛏 {rental.bedroom} BHK</span>
                <span>🚿 {rental.bathroom}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{rental.furnishing}</span>
                {rental.deposit > 0 && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Deposit: {formatPrice(rental.deposit)}</span>}
              </div>
              <p className="text-xs text-gray-500">
                {rental.posted_by_name} · {formatDate(rental.posted_at)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {isLoading && <div className="text-center py-8 text-gray-500">Loading...</div>}
      {hasMore && !isLoading && (
        <div className="text-center pt-4">
          <button onClick={loadMore} className="bg-green-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors">
            Load More ({total - rentals.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
