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
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span>🔍</span> Filter Properties
        </h3>
        <button
          onClick={handleReset}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Locality */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Locality</label>
          <input
            type="text"
            list="locality-options"
            value={locality}
            onChange={e => setLocality(e.target.value)}
            placeholder="e.g. mulund west, bandra"
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          <datalist id="locality-options">
            {LOCALITIES.map(l => <option key={l} value={l} />)}
          </datalist>
        </div>

        {/* BHK */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bedrooms</label>
          <select
            value={bhk}
            onChange={e => setBhk(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">Any BHK</option>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} BHK</option>)}
          </select>
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
          <select
            value={propertyType}
            onChange={e => setPropertyType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Any Type'}</option>)}
          </select>
        </div>

        {/* Furnishing */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Furnishing</label>
          <select
            value={furnishing}
            onChange={e => setFurnishing(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            {FURNISHINGS.map(f => (
              <option key={f} value={f}>{f ? f.charAt(0).toUpperCase() + f.slice(1) : 'Any'}</option>
            ))}
          </select>
        </div>

        {/* Min Price */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Min Price (₹)</label>
          <input
            type="number"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            placeholder="₹ Min"
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleApply}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>Apply Filters</span>
          </button>
          <button
            onClick={handleReset}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
