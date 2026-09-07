import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchTiffinProviders } from '../api/tiffin';
import TiffinFilters from '../components/tiffin/TiffinFilters';
import TiffinProviderCard from '../components/tiffin/TiffinProviderCard';
import TiffinTopbar from '../components/tiffin/TiffinTopbar';
import './Tiffin.css';

const initialFilters = { vegOnly: false, mealOnly: false, maxPrice: null, search: '' };

export default function TiffinListing() {
  const [providers, setProviders] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchTiffinProviders({}, { signal: controller.signal })
      .then((result) => {
        if (!result.aborted) {
          setProviders(result.data || []);
          setError(result.error?.message || '');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const visibleProviders = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return providers.filter((provider) => {
      if (filters.vegOnly && !['VEG', 'JAIN', 'VEGAN'].includes(provider.foodType)) return false;
      if (filters.mealOnly && !String(provider.mealType).toLowerCase().includes('lunch')) return false;
      if (filters.maxPrice && provider.price > filters.maxPrice) return false;
      if (query && !`${provider.name} ${provider.cuisine}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [filters, providers]);

  return (
    <main className="tiffin-page tiffin-listing-page" id="tiffin-listing">
      <div className="tiffin-content">
        <TiffinTopbar backTo="/services" />
        <header className="tiffin-listing-heading">
          <h1>Homely Meals. Made Simple.</h1>
          <p>Discover reliable tiffin services near your stay. Curated for hygiene, taste, and daily convenience.</p>
        </header>

        <TiffinFilters filters={filters} onChange={(change) => setFilters((current) => ({ ...current, ...change }))} />

        {loading ? (
          <div className="tiffin-state"><Loader2 size={24} className="spinning" /><span>Finding tiffin providers...</span></div>
        ) : error ? (
          <div className="tiffin-state"><span>{error}</span></div>
        ) : visibleProviders.length ? (
          <section className="tiffin-provider-grid" aria-label="Tiffin providers">
            {visibleProviders.map((provider) => <TiffinProviderCard key={provider.id} provider={provider} />)}
          </section>
        ) : (
          <div className="tiffin-state"><span>No providers match these filters.</span><button type="button" onClick={() => setFilters(initialFilters)}>Clear filters</button></div>
        )}
      </div>
    </main>
  );
}
