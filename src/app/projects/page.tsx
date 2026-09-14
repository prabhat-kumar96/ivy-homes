'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects, formatProjectPrice, type Project, type ProjectFilters } from '@/lib/api';
import Link from 'next/link';

const PAGE_SIZE = 24;

export default function ProjectsPage() {
  const { refreshIfNeeded, token, session, isLoading: authLoading, switchAccount } = useAuth();
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
      if (!t) return;
      const filters: ProjectFilters = { page: pg, limit: PAGE_SIZE };
      if (locality) filters.locality = locality;
      if (status) filters.project_status = status;
      if (sortBy) filters.sort_by = sortBy;
      filters.order = order;
      const result = await getProjects(filters, t);
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
    if (!token) return;
    setPage(1);
    fetchProjects(1);
  }, [locality, status, sortBy, order, token, fetchProjects]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchProjects(next);
  };

  const hasMore = projects.length < total;

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
        <h2 className="text-2xl font-bold text-slate-900">Sign in to View Projects</h2>
        <p className="text-sm text-slate-600">Please choose a demo account to browse verified Mumbai development projects:</p>
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mumbai Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">Under-construction and ready-to-move residential developments</p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          {total.toLocaleString('en-IN')} Verified Projects
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
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="">Any Status</option>
              <option value="under construction">Under Construction</option>
              <option value="ready to move">Ready to Move</option>
              <option value="new launch">New Launch</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="">Default Order</option>
              <option value="price_max">Highest Price</option>
              <option value="price_min">Lowest Price</option>
              <option value="total_units">Total Units</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setLocality(''); setStatus(''); setSortBy(''); }}
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
        {projects.map(proj => (
          <Link
            key={proj.project_id}
            href={`/projects/${proj.project_id}`}
            className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between overflow-hidden"
          >
            <div>
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-start justify-between">
                <div>
                  <span className="inline-block text-[11px] font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-md mb-1">
                    {proj.locality}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm leading-snug truncate" title={proj.apartment_name}>
                    {proj.apartment_name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">by {proj.developer_name}</p>
                </div>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold capitalize ${
                  proj.project_status === 'ready to move' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  proj.project_status === 'under construction' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {proj.project_status}
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-extrabold text-slate-900">
                    {formatProjectPrice(proj.price_min)} – {formatProjectPrice(proj.price_max)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {proj.min_area_sqft}–{proj.max_area_sqft} sq.ft
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span>🏢</span>
                    <span className="font-semibold text-slate-800">{proj.total_units} Units</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>📋</span>
                    <span className="font-semibold text-slate-800">{proj.total_listings} Listings</span>
                  </div>
                </div>

                {proj.amenities && proj.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {proj.amenities.slice(0, 3).map(a => (
                      <span key={a} className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md capitalize font-medium">
                        {a}
                      </span>
                    ))}
                    {proj.amenities.length > 3 && (
                      <span className="text-[11px] text-slate-400 self-center">+{proj.amenities.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 text-xs font-bold text-purple-600 flex items-center justify-between group-hover:bg-purple-50/30 transition-colors">
              <span>View Project Details</span>
              <span>→</span>
            </div>
          </Link>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-10 text-slate-400 text-sm font-medium">Loading projects...</div>
      )}

      {hasMore && !isLoading && (
        <div className="text-center pt-4 pb-4">
          <button
            onClick={loadMore}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-sm transition-all"
          >
            Load More Projects ({total - projects.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
