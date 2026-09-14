import { formatPrice, formatArea, type Listing } from '@/lib/api';
import Link from 'next/link';

interface Props {
  listing: Listing;
  isSaved?: boolean;
  onSaveToggle?: (id: string, isSaved: boolean) => void;
}

export function ListingCard({ listing, isSaved, onSaveToggle }: Props) {
  const pricePerSqft = listing.carpet_area > 0
    ? Math.round(listing.price / listing.carpet_area)
    : null;

  const isCorrupt = listing.price < 0 || listing.carpet_area <= 0 ||
    listing.super_built_up_area <= 0 ||
    listing.carpet_area > listing.super_built_up_area;

  return (
    <div className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden ${isCorrupt ? 'border-red-300' : 'border-gray-200'}`}>
      {/* Header with locality badge */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide truncate">
            {listing.locality}
          </p>
          <h3 className="font-semibold text-gray-800 text-sm leading-tight mt-0.5 truncate">
            {listing.apartment_name || 'Unknown Property'}
          </h3>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {isCorrupt && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Corrupt</span>
          )}
          {listing.is_live ? (
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Active" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" title="Inactive" />
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        {/* Price */}
        <div className="flex items-baseline justify-between">
          <span className={`text-lg font-bold ${listing.price < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatPrice(listing.price)}
          </span>
          {pricePerSqft && pricePerSqft > 0 && (
            <span className="text-xs text-gray-500">₹{pricePerSqft.toLocaleString('en-IN')}/sq.ft</span>
          )}
        </div>

        {/* Key stats */}
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>🛏 {listing.bedroom} BHK</span>
          <span>🚿 {listing.bathroom}</span>
          <span>📐 {formatArea(listing.carpet_area)}</span>
        </div>

        {/* Property type & furnishing */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
            {listing.property_type}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
            {listing.furnishing}
          </span>
          {listing.floor != null && listing.total_floors != null && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              Floor {listing.floor}/{listing.total_floors}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
        <Link
          href={`/listings/${listing.listing_id}`}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Details →
        </Link>
        {onSaveToggle && (
          <button
            onClick={() => onSaveToggle(listing.listing_id, !!isSaved)}
            className={`text-sm px-3 py-1 rounded font-medium transition-colors ${
              isSaved
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {isSaved ? '♥ Saved' : '♡ Save'}
          </button>
        )}
      </div>
    </div>
  );
}
