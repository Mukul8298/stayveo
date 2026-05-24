import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal, Grid3X3, List, Loader } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import ListingCard from '../components/ListingCard';
import FilterSheet from '../components/FilterSheet';
import { searchPGListings, fetchPGListings } from '../api/supabaseApi';
import { getCollegeById } from '../api/colleges';
import { useNearbyPGs } from '../hooks/useNearbyPGs';
import './SearchResults.css';

// ── SearchResults ───────────────────────────────────────────────────────
// MIGRATION CHANGES:
// - Removed mockListings import — uses ONLY real Supabase data
// - Uses AbortController for safe async cancellation
// - No mock data fallback in search error path
// ────────────────────────────────────────────────────────────────────────

export default function SearchResults() {
  const navigate = useNavigate();
  const [view, setView] = useState('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Start with empty array — NO mock data
  const [listings, setListings] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const searchTimeoutRef = useRef(null);
  const abortRef = useRef(null);
  const nearbyListings = useNearbyPGs(listings, selectedCollege);

  useEffect(() => {
    const controller = new AbortController();
    const latitude = Number(localStorage.getItem('selectedCollegeLatitude'));
    const longitude = Number(localStorage.getItem('selectedCollegeLongitude'));

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      setSelectedCollege({ latitude, longitude });
      return () => controller.abort();
    }

    const collegeId = localStorage.getItem('userCollegeId') || localStorage.getItem('selectedCollegeId');
    if (!collegeId) return () => controller.abort();

    getCollegeById(collegeId, { signal: controller.signal })
      .then((college) => {
        if (controller.signal.aborted) return;
        setSelectedCollege(college);
        localStorage.setItem('selectedCollegeLatitude', String(college.latitude));
        localStorage.setItem('selectedCollegeLongitude', String(college.longitude));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.warn('SearchResults: college lookup failed:', err);
      });

    return () => controller.abort();
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const { data, aborted } = await fetchPGListings({ signal: controller.signal });
        if (aborted) return;
        setListings(data || []);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('SearchResults: initial load error:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, []);

  // ── Debounced search with AbortController ─────────────────────────────
  const handleSearch = useCallback((e) => {
    const value = e?.target?.value ?? e ?? '';
    setQuery(value);

    // Clear previous search timer
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    // Abort previous in-flight search request
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      if (!value.trim()) {
        // Reset to all listings
        const { data, aborted } = await fetchPGListings({ signal: controller.signal });
        if (!aborted) setListings(data || []);
        return;
      }

      setLoading(true);
      try {
        const { data, error, aborted } = await searchPGListings(value, { signal: controller.signal });
        if (aborted) return;

        if (error) {
          console.error('Search error:', error);
          // Show empty results on error — no mock fallback
          setListings([]);
        } else {
          setListings(data || []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Search unexpected error:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 400); // 400ms debounce

    searchTimeoutRef.current = timer;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

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
          {loading ? 'Searching...' : `${nearbyListings.length} listing${nearbyListings.length !== 1 ? 's' : ''} found`}
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
      {!loading && nearbyListings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No PGs found</h3>
          <p>Try a different search term or check back later</p>
        </div>
      )}

      {/* Results */}
      <div className={`search-grid search-${view}`}>
        {nearbyListings.map(l => <ListingCard key={l.id} listing={l} variant={view === 'grid' ? 'vertical' : 'horizontal'} />)}
      </div>

      <FilterSheet isOpen={filterOpen} onClose={() => setFilterOpen(false)} />
    </div>
  );
}
