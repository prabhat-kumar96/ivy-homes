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
    <div className={`group bg-white rounded-2xl shadow-sm border transition-all duration-200 hover:shadow-md hover:border-blue-200 flex flex-col justify-between overflow-hidden ${isCorrupt ? 'border-red-300 bg-red-50/20' : 'border-slate-200'}`}>
      <div>
        {/* Header with locality and status */}
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <span className="inline-block text-[11px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md mb-1">
              {listing.locality || 'Mumbai'}
            </span>
            <h3 className="font-bold text-slate-800 text-sm leading-snug truncate" title={listing.apartment_name}>
              {listing.apartment_name || 'Apartment in Mumbai'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isCorrupt && (
              <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Corrupt</span>
            )}
            {listing.is_live ? (
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            ) : (
              <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Inactive</span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3">
          {/* Price & Rate */}
          <div className="flex items-baseline justify-between">
            <span className={`text-xl font-extrabold tracking-tight ${listing.price < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {formatPrice(listing.price)}
            </span>
            {pricePerSqft && pricePerSqft > 0 && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                ₹{pricePerSqft.toLocaleString('en-IN')}/sq.ft
              </span>
            )}
          </div>

          {/* Key Specs */}
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🛏</span>
              <span className="font-semibold text-slate-800">{listing.bedroom} BHK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">🚿</span>
              <span className="font-semibold text-slate-800">{listing.bathroom} Baths</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">📐</span>
              <span className="font-semibold text-slate-800">{formatArea(listing.carpet_area)}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium capitalize">
              {listing.property_type || 'Residential'}
            </span>
            {listing.furnishing && (
              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium capitalize">
                {listing.furnishing}
              </span>
            )}
            {listing.floor != null && listing.total_floors != null && (
              <span className="text-slate-500 text-[11px] px-1 py-0.5">
                Fl: {listing.floor}/{listing.total_floors}
              </span>
            )}
            {listing.website && (
              <span className="ml-auto text-[10px] text-slate-400 font-mono">
                via {listing.website}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
        <Link
          href={`/listings/${listing.listing_id}`}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
        >
          View Details →
        </Link>
        {onSaveToggle && (
          <button
            onClick={() => onSaveToggle(listing.listing_id, !!isSaved)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
              isSaved
                ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>{isSaved ? '♥' : '♡'}</span>
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
