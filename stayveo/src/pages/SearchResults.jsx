import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal, Grid3X3, List, Loader, SearchX } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import ListingCard from '../components/ListingCard';
import FilterSheet from '../components/FilterSheet';
import { listings as mockListings } from '../data/mockData';
import { searchPGListings, fetchPGListings } from '../api/supabaseApi';
import './SearchResults.css';

export default function SearchResults() {
  const navigate = useNavigate();
  const [view, setView] = useState('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [listings, setListings] = useState(mockListings);
  const [loading, setLoading] = useState(true);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // ── Initial load ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await fetchPGListings();
        if (data?.length > 0) setListings(data);
      } catch (err) {
        console.error('SearchResults: initial load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Debounced search ──────────────────────────────────────────────────
  const handleSearch = useCallback((e) => {
    const value = e?.target?.value ?? e ?? '';
    setQuery(value);

    if (searchTimeout) clearTimeout(searchTimeout);

    const timer = setTimeout(async () => {
      if (!value.trim()) {
        // Reset to all listings
        const { data } = await fetchPGListings();
        if (data?.length > 0) setListings(data);
        else setListings(mockListings);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await searchPGListings(value);
        if (error) {
          console.error('Search error:', error);
          // Fallback: filter mock data
          setListings(mockListings.filter(l =>
            l.title.toLowerCase().includes(value.toLowerCase()) ||
            l.address.toLowerCase().includes(value.toLowerCase())
          ));
        } else {
          setListings(data?.length > 0 ? data : []);
        }
      } catch (err) {
        console.error('Search unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    setSearchTimeout(timer);
  }, [searchTimeout]);

  return (
    <div className="page" id="search-results">
      <div className="search-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1 }}>
          <SearchBar
            value={query}
            onChange={handleSearch}
            placeholder="Search PGs near campus..."
          />
        </div>
      </div>
      <div className="search-controls">
        <div className="search-count">
          {loading ? 'Searching...' : `${listings.length} listing${listings.length !== 1 ? 's' : ''} found`}
        </div>
        <div className="search-actions">
          <button className={`view-toggle ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}><Grid3X3 size={16} /></button>
          <button className={`view-toggle ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}><List size={16} /></button>
          <button className="filter-btn" onClick={() => setFilterOpen(true)}><SlidersHorizontal size={16} /> Filters</button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="search-loading">
          <Loader size={24} className="spinning" />
        </div>
      )}

      {/* Empty state */}
      {!loading && listings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No PGs found</h3>
          <p>Try a different search term or check back later</p>
        </div>
      )}

      {/* Results */}
      <div className={`search-grid search-${view}`}>
        {listings.map(l => <ListingCard key={l.id} listing={l} variant={view === 'grid' ? 'vertical' : 'horizontal'} />)}
      </div>

      <FilterSheet isOpen={filterOpen} onClose={() => setFilterOpen(false)} />
    </div>
  );
}
