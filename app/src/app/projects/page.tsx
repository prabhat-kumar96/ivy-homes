'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects, formatPrice, type Project, type ProjectFilters } from '@/lib/api';
import Link from 'next/link';

const PAGE_SIZE = 20;

export default function ProjectsPage() {
  const { refreshIfNeeded } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locality, setLocality] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [order, setOrder] = useState('desc');

  const fetchProjects = useCallback(async (pg: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const t = await refreshIfNeeded();
      const filters: ProjectFilters = { page: pg, limit: PAGE_SIZE };
      if (locality) filters.locality = locality;
      if (status) filters.project_status = status;
      if (sortBy) filters.sort_by = sortBy;
      filters.order = order;
      const result = await getProjects(filters, t || undefined);
      if (pg === 1) {
        setProjects(result.results);
      } else {
        setProjects(prev => [...prev, ...result.results]);
      }
      setTotal(result.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [refreshIfNeeded, locality, status, sortBy, order]);

  useEffect(() => {
    setPage(1);
    fetchProjects(1);
  }, [locality, status, sortBy, order]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchProjects(next);
  };

  const hasMore = projects.length < total;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mumbai Projects</h1>
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
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Any</option>
              <option value="under construction">Under Construction</option>
              <option value="ready to move">Ready to Move</option>
              <option value="new launch">New Launch</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sort By</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Default</option>
              <option value="price_max">Max Price</option>
              <option value="price_min">Min Price</option>
              <option value="total_units">Total Units</option>
              <option value="launch_date">Launch Date</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Order</label>
            <select value={order} onChange={e => setOrder(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="desc">High → Low</option>
              <option value="asc">Low → High</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map(proj => (
          <Link key={proj.project_id} href={`/projects/${proj.project_id}`} className="block">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">{proj.locality}</p>
                  <h3 className="font-semibold text-gray-800 text-base mt-0.5">{proj.apartment_name}</h3>
                  <p className="text-sm text-gray-500">{proj.developer_name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  proj.project_status === 'ready to move'
                    ? 'bg-green-100 text-green-700'
                    : proj.project_status === 'under construction'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {proj.project_status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                {/* price_min and price_max are in rupees — verified */}
                <div>
                  <p className="text-xs text-gray-500">Price Range</p>
                  <p className="font-medium">{formatPrice(proj.price_min)} – {formatPrice(proj.price_max)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Area Range</p>
                  <p className="font-medium">{proj.min_area_sqft}–{proj.max_area_sqft} sq.ft</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Units</p>
                  <p className="font-medium">{proj.total_units}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Listings</p>
                  <p className="font-medium">{proj.total_listings}</p>
                </div>
              </div>

              {proj.amenities && proj.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {proj.amenities.slice(0, 4).map(a => (
                    <span key={a} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full capitalize">{a}</span>
                  ))}
                  {proj.amenities.length > 4 && (
                    <span className="text-xs text-gray-400">+{proj.amenities.length - 4} more</span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {isLoading && <div className="text-center py-8 text-gray-500">Loading...</div>}
      {hasMore && !isLoading && (
        <div className="text-center pt-4">
          <button onClick={loadMore} className="bg-purple-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition-colors">
            Load More ({total - projects.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
