'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getListing, addFavourite, removeFavourite, getFavourites, formatPrice, formatArea, formatDate, type Listing } from '@/lib/api';
import Link from 'next/link';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, refreshIfNeeded, session } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);

  const id = params.id as string;

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const t = await refreshIfNeeded();
        const data = await getListing(id, t || undefined);
        setListing(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load listing');
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
  }, [id, refreshIfNeeded]);

  useEffect(() => {
    async function checkSaved() {
      if (!session) return;
      const t = await refreshIfNeeded();
      if (!t) return;
      try {
        const favs = await getFavourites(t);
        setIsSaved(favs.results.some(l => l.listing_id === id));
      } catch {}
    }
    checkSaved();
  }, [id, session, refreshIfNeeded]);

  const handleSaveToggle = async () => {
    const t = await refreshIfNeeded();
    if (!t) { router.push('/login'); return; }
    setSavingLoading(true);
    try {
      if (isSaved) {
        await removeFavourite(id, t);
        setIsSaved(false);
      } else {
        await addFavourite(id, t);
        setIsSaved(true);
      }
    } catch (e: unknown) {
      console.error('Save error:', e);
    } finally {
      setSavingLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="h-64 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-700 text-lg">{error}</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">← Back to listings</Link>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const pricePerSqft = listing.carpet_area > 0 ? Math.round(listing.price / listing.carpet_area) : null;
  const isCorrupt = listing.price < 0 || listing.carpet_area <= 0 ||
    listing.carpet_area > listing.super_built_up_area;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/" className="hover:text-blue-600">Listings</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-800">{listing.apartment_name}</span>
      </nav>

      {isCorrupt && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-800">Potentially corrupt record</p>
            <p className="text-sm text-red-700">
              {listing.price < 0 && 'Negative price. '}
              {listing.carpet_area > listing.super_built_up_area && 'Carpet area exceeds super built-up area.'}
            </p>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-300 text-sm uppercase tracking-wide">{listing.locality} · {listing.property_type}</p>
              <h1 className="text-2xl font-bold mt-1">{listing.apartment_name}</h1>
              <p className="text-blue-200 text-sm mt-1">{listing.website}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{formatPrice(listing.price)}</div>
              {pricePerSqft && pricePerSqft > 0 && (
                <p className="text-blue-300 text-sm">₹{pricePerSqft.toLocaleString('en-IN')}/sq.ft</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-gray-100">
          <Stat icon="🛏" label="Bedrooms" value={`${listing.bedroom} BHK`} />
          <Stat icon="🚿" label="Bathrooms" value={listing.bathroom} />
          <Stat icon="🏢" label="Floor" value={`${listing.floor} / ${listing.total_floors}`} />
          <Stat icon="🚘" label="Parking" value={listing.covered_parking} />
        </div>

        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat icon="📐" label="Carpet Area" value={formatArea(listing.carpet_area)} />
          <Stat icon="📏" label="Built-up Area" value={formatArea(listing.super_built_up_area)} />
          <Stat icon="🪟" label="Balcony" value={listing.balcony} />
          <Stat icon="🧹" label="Furnishing" value={listing.furnishing} />
          <Stat icon="🧭" label="Facing" value={listing.facing_direction} />
          <Stat icon="✅" label="Verified" value={listing.is_verified ? 'Yes' : 'No'} />
        </div>
      </div>

      {/* Description */}
      {listing.description && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-700 leading-relaxed">{listing.description}</p>
        </div>
      )}

      {/* Contact & meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Posted By</h2>
          <div className="space-y-2">
            <p className="text-gray-700"><span className="font-medium">Name:</span> {listing.posted_by_name}</p>
            <p className="text-gray-700"><span className="font-medium">Type:</span> {listing.posted_by}</p>
            <p className="text-gray-700"><span className="font-medium">Contact:</span> {listing.posted_by_contact}</p>
            <p className="text-sm text-gray-500">Posted: {formatDate(listing.posted_at)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Details</h2>
          <div className="space-y-2">
            <p className="text-gray-700 text-sm"><span className="font-medium">Listing ID:</span> {listing.listing_id}</p>
            {listing.project_id && (
              <p className="text-gray-700 text-sm">
                <span className="font-medium">Project:</span>{' '}
                <Link href={`/projects/${listing.project_id}`} className="text-blue-600 hover:underline">
                  {listing.project_id}
                </Link>
              </p>
            )}
            <p className="text-gray-700 text-sm">
              <span className="font-medium">Status:</span>{' '}
              <span className={listing.is_live ? 'text-green-600 font-medium' : 'text-gray-500'}>
                {listing.is_live ? 'Active' : 'Inactive'}
              </span>
            </p>
            <p className="text-gray-700 text-sm">
              <span className="font-medium">Location:</span> {listing.latitude.toFixed(4)}, {listing.longitude.toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSaveToggle}
          disabled={savingLoading}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
            isSaved
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {savingLoading ? 'Saving...' : isSaved ? '♥ Remove from Saved' : '♡ Save Listing'}
        </button>
        <a
          href={listing.listing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          View on {listing.website} ↗
        </a>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-800 capitalize">{value}</p>
      </div>
    </div>
  );
}
