'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getFavourites, removeFavourite, type Listing } from '@/lib/api';
import { ListingCard } from '@/components/ListingCard';

export default function SavedPage() {
  const { session, refreshIfNeeded } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const loadFavourites = useCallback(async () => {
    if (!session) { router.push('/login'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const t = await refreshIfNeeded();
      if (!t) { router.push('/login'); return; }
      const favs = await getFavourites(t);
      setListings(favs.results);
      setSavedIds(new Set(favs.results.map(l => l.listing_id)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load saved listings');
    } finally {
      setIsLoading(false);
    }
  }, [session, refreshIfNeeded, router]);

  useEffect(() => {
    loadFavourites();
  }, [loadFavourites]);

  const handleRemove = async (id: string) => {
    const t = await refreshIfNeeded();
    if (!t) return;
    try {
      await removeFavourite(id, t);
      setListings(prev => prev.filter(l => l.listing_id !== id));
      setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    } catch (e: unknown) {
      console.error('Remove failed:', e);
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Saved Listings</h1>
        <span className="text-sm text-gray-500">{listings.length} saved</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
          <p className="text-sm text-gray-500 mt-2">
            The favourites endpoint may not be available. Your saved listings are stored server-side per user session.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-52 animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">♡</p>
          <p className="text-lg text-gray-700 font-medium">No saved listings yet</p>
          <p className="text-gray-500 mt-1">Browse listings and click ♡ Save to add them here</p>
          <button onClick={() => router.push('/')} className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700">
            Browse Listings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(listing => (
            <ListingCard
              key={listing.listing_id}
              listing={listing}
              isSaved={true}
              onSaveToggle={(id) => handleRemove(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
