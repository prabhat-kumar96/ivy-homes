'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getProject, getListings, formatPrice, type Project, type Listing } from '@/lib/api';
import Link from 'next/link';
import { ListingCard } from '@/components/ListingCard';

export default function ProjectDetailPage() {
  const params = useParams();
  const { refreshIfNeeded } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params.id as string;

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const t = await refreshIfNeeded();
        const [proj, lstgs] = await Promise.all([
          getProject(id, t || undefined),
          // FINDING: project_id filter on /v1/listings doesn't work — returns all listings
          // So we just show unfiltered listings as a workaround
          getListings({ limit: 20 }, t || undefined),
        ]);
        setProject(proj);
        // Filter client-side since server filter is broken
        setListings(lstgs.results.filter(l => l.project_id === id));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
  }, [id, refreshIfNeeded]);

  if (isLoading) {
    return <div className="animate-pulse space-y-4 max-w-5xl mx-auto"><div className="h-8 bg-gray-200 rounded w-1/2" /><div className="h-64 bg-gray-200 rounded-xl" /></div>;
  }
  if (error) {
    return <div className="max-w-5xl mx-auto bg-red-50 border border-red-200 rounded-xl p-8 text-center"><p className="text-red-700">{error}</p><Link href="/projects" className="mt-4 inline-block text-blue-600 hover:underline">← Back to projects</Link></div>;
  }
  if (!project) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/projects" className="hover:text-blue-600">Projects</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-800">{project.apartment_name}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-purple-300 text-sm uppercase tracking-wide">{project.locality}</p>
              <h1 className="text-2xl font-bold mt-1">{project.apartment_name}</h1>
              <p className="text-purple-200 text-sm mt-1">by {project.developer_name}</p>
            </div>
            <div className="text-right">
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                project.project_status === 'ready to move' ? 'bg-green-500' :
                project.project_status === 'under construction' ? 'bg-amber-500' : 'bg-blue-500'
              }`}>{project.project_status}</span>
              <div className="text-2xl font-bold mt-2">{formatPrice(project.price_min)} – {formatPrice(project.price_max)}</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-gray-100">
          <Stat label="Total Units" value={project.total_units} />
          <Stat label="Towers" value={project.total_towers} />
          <Stat label="Floors" value={project.total_floors} />
          <Stat label="Listings" value={project.total_listings} note="(may be inaccurate)" />
        </div>

        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat label="Area Range" value={`${project.min_area_sqft}–${project.max_area_sqft} sq.ft`} />
          <Stat label="Launch Date" value={project.launch_date} />
          <Stat label="Possession" value={project.possession_date} />
          <Stat label="RERA" value={project.rera_number} />
          <Stat label="Project ID" value={project.project_id} />
        </div>

        {project.amenities && project.amenities.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Amenities</p>
            <div className="flex flex-wrap gap-2">
              {project.amenities.map(a => (
                <span key={a} className="text-sm bg-purple-50 text-purple-600 px-3 py-1 rounded-full capitalize">{a}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Listings in this project */}
      {listings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Listings in this Project ({listings.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map(l => <ListingCard key={l.listing_id} listing={l} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value} {note && <span className="text-xs text-amber-600">{note}</span>}</p>
    </div>
  );
}
