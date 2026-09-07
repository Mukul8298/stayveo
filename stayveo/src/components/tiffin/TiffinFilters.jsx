import { useState } from 'react';
import { Check, ChevronDown, Search, Utensils } from 'lucide-react';

export default function TiffinFilters({ filters, onChange }) {
  const [priceOpen, setPriceOpen] = useState(false);
  const priceOptions = [
    { label: 'Any price', value: null },
    { label: 'Under ₹80', value: 80 },
    { label: 'Under ₹120', value: 120 },
    { label: 'Under ₹160', value: 160 },
  ];

  return (
    <div className="tiffin-filter-bar">
      <div className="tiffin-filter-chips" aria-label="Tiffin filters">
        <button type="button" className={`tiffin-filter-chip ${filters.vegOnly ? 'is-selected' : ''}`} onClick={() => onChange({ vegOnly: !filters.vegOnly })} aria-pressed={filters.vegOnly}>
          <span className="veg-dot" /> Pure Veg
        </button>
        <button type="button" className={`tiffin-filter-chip ${filters.mealOnly ? 'is-selected' : ''}`} onClick={() => onChange({ mealOnly: !filters.mealOnly })} aria-pressed={filters.mealOnly}>
          <Utensils size={12} /> Lunch &amp; Dinner
        </button>
        <div className="tiffin-price-filter">
          <button type="button" className={`tiffin-filter-chip ${filters.maxPrice ? 'is-selected' : ''}`} onClick={() => setPriceOpen((open) => !open)} aria-expanded={priceOpen}>
            <span>Price Range</span><ChevronDown size={13} />
          </button>
          {priceOpen && (
            <div className="tiffin-price-menu">
              {priceOptions.map((option) => (
                <button type="button" key={option.label} onClick={() => { onChange({ maxPrice: option.value }); setPriceOpen(false); }}>
                  {option.label}
                  {filters.maxPrice === option.value && <Check size={13} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <label className="tiffin-search">
        <Search size={14} />
        <span className="sr-only">Search providers</span>
        <input value={filters.search} onChange={(event) => onChange({ search: event.target.value })} placeholder="Search providers..." />
      </label>
    </div>
  );
}
