'use client';

import { useState } from 'react';

interface FilterBarProps {
  onFilter: (filters: Record<string, string | number | undefined>) => void;
  initialFilters?: Record<string, string | number | undefined>;
}

const LOCALITIES = [
  'mulund west', 'andheri west', 'bandra west', 'borivali west', 'goregaon west',
  'kandivali west', 'malad west', 'mira road', 'thane west', 'navi mumbai',
  'powai', 'vikhroli', 'ghatkopar east', 'kurla', 'chembur', 'matunga',
  'dadar', 'prabhadevi', 'worli', 'lower parel',
];

const PROPERTY_TYPES = [
  '', 'apartment', 'villa', 'independent house', 'plot', 'builder floor'
];

const FURNISHINGS = ['', 'unfurnished', 'semi-furnished', 'fully-furnished'];

export function FilterBar({ onFilter, initialFilters = {} }: FilterBarProps) {
  const [locality, setLocality] = useState<string>((initialFilters.locality as string) || '');
  const [bhk, setBhk] = useState<string>((initialFilters.bhk as string) || '');
  const [minPrice, setMinPrice] = useState<string>((initialFilters.min_price as string) || '');
  const [maxPrice, setMaxPrice] = useState<string>((initialFilters.max_price as string) || '');
  const [propertyType, setPropertyType] = useState<string>((initialFilters.property_type as string) || '');
  const [furnishing, setFurnishing] = useState<string>((initialFilters.furnishing as string) || '');

  const handleApply = () => {
    const filters: Record<string, string | number | undefined> = {};
    if (locality) filters.locality = locality;
    if (bhk) filters.bhk = parseInt(bhk);
    if (minPrice) filters.min_price = parseInt(minPrice);
    if (maxPrice) filters.max_price = parseInt(maxPrice);
    if (propertyType) filters.property_type = propertyType;
    if (furnishing) filters.furnishing = furnishing;
    onFilter(filters);
  };

  const handleReset = () => {
    setLocality('');
    setBhk('');
    setMinPrice('');
    setMaxPrice('');
    setPropertyType('');
    setFurnishing('');
    onFilter({});
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Locality */}
        <div className="lg:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Locality</label>
          <input
            type="text"
            list="locality-options"
            value={locality}
            onChange={e => setLocality(e.target.value)}
            placeholder="e.g. mulund west"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <datalist id="locality-options">
            {LOCALITIES.map(l => <option key={l} value={l} />)}
          </datalist>
        </div>

        {/* BHK */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">BHK</label>
          <select
            value={bhk}
            onChange={e => setBhk(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} BHK</option>)}
          </select>
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            value={propertyType}
            onChange={e => setPropertyType(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t || 'Any'}</option>)}
          </select>
        </div>

        {/* Furnishing */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Furnishing</label>
          <select
            value={furnishing}
            onChange={e => setFurnishing(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {FURNISHINGS.map(f => (
              <option key={f} value={f}>{f || 'Any'}</option>
            ))}
          </select>
        </div>

        {/* Price range */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min Price (₹)</label>
            <input
              type="number"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max Price (₹)</label>
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="No limit"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleApply}
          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Apply Filters
        </button>
        <button
          onClick={handleReset}
          className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
