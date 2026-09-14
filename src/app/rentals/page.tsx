'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRentals, formatPrice, formatArea, formatDate, type Rental, type RentalFilters } from '@/lib/api';
import Link from 'next/link';

const PAGE_SIZE = 24;

export default function RentalsPage() {
  const { refreshIfNeeded, token, session, isLoading: authLoading, switchAccount } = useAuth();
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
      if (!t) return;
      const filters: RentalFilters = { page: pg, limit: PAGE_SIZE };
      if (locality) filters.locality = locality;
      if (bhk) filters.bhk = parseInt(bhk);
      if (furnishing) filters.furnishing = furnishing;
      const result = await getRentals(filters, t);
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
    if (!token) return;
    setPage(1);
    fetchRentals(1);
  }, [locality, bhk, furnishing, token, fetchRentals]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchRentals(next);
  };

  const hasMore = rentals.length < total;

  if (authLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto py-8">
        <div className="h-10 bg-slate-200 rounded-xl w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Sign in to View Rentals</h2>
        <p className="text-sm text-slate-600">Please choose a demo account to browse verified Mumbai rental units:</p>
        <div className="flex justify-center gap-3">
          {['demo1@ivy.homes', 'demo2@ivy.homes'].map(email => (
            <button
              key={email}
              onClick={() => switchAccount(email)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700"
            >
              Sign in as {email}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mumbai Rentals</h1>
          <p className="text-sm text-slate-500 mt-0.5">Verified residential rental offerings and monthly lease rates</p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {total.toLocaleString('en-IN')} Active Rentals
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Locality</label>
            <input
              type="text"
              value={locality}
              onChange={e => setLocality(e.target.value)}
              placeholder="e.g. mulund west, bandra"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Bedrooms</label>
            <select
              value={bhk}
              onChange={e => setBhk(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Any BHK</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} BHK</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Furnishing</label>
            <select
              value={furnishing}
              onChange={e => setFurnishing(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Any</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="semi-furnished">Semi-furnished</option>
              <option value="fully-furnished">Fully-furnished</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setLocality(''); setBhk(''); setFurnishing(''); }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rentals.map(rental => (
          <div
            key={rental.listing_id}
            className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between overflow-hidden"
          >
            <div>
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-start justify-between">
                <div>
                  <span className="inline-block text-[11px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md mb-1">
                    {rental.locality}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm leading-snug truncate" title={rental.apartment_name}>
                    {rental.apartment_name || 'Apartment for Rent'}
                  </h3>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Rent</span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-extrabold text-slate-900">
                    {formatPrice(rental.price)}<span className="text-xs text-slate-500 font-normal">/mo</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {formatArea(rental.carpet_area)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span>🛏</span>
                    <span className="font-semibold text-slate-800">{rental.bedroom} BHK</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>🚿</span>
                    <span className="font-semibold text-slate-800">{rental.bathroom} Baths</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium capitalize">
                    {rental.furnishing}
                  </span>
                  {rental.deposit > 0 && (
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
                      Dep: {formatPrice(rental.deposit)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{rental.posted_by_name || 'Agent'}</span>
              <span>{formatDate(rental.posted_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-10 text-slate-400 text-sm font-medium">Loading rental listings...</div>
      )}

      {hasMore && !isLoading && (
        <div className="text-center pt-4 pb-4">
          <button
            onClick={loadMore}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-sm transition-all"
          >
            Load More Rentals ({total - rentals.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
