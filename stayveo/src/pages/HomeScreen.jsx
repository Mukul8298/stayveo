import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, SlidersHorizontal, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import ListingCard from '../components/ListingCard';
import { fetchPGListings, subscribeToPGChanges } from '../api/supabaseApi';
import { getCollegeById } from '../api/colleges';
import { useAuth } from '../context/AuthContext';
import { useNearbyPGs } from '../hooks/useNearbyPGs';
import './HomeScreen.css';

// ── HomeScreen ──────────────────────────────────────────────────────────
// MIGRATION CHANGES:
// - Removed mockListings import — uses ONLY real Supabase data
// - Uses AuthContext `displayName` instead of raw localStorage
//   (handles old users with missing/corrupted userName)
// - Uses AbortController for safe async cancellation on unmount
// - Added error state with retry UI
// - Added empty state for when no PGs exist in DB
// ────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Auth: use the resolved display name from context ────────────────
  // `displayName` is guaranteed to NEVER be undefined/null/"undefined".
  // For old users, AuthContext resolves it from Supabase metadata,
  // localStorage, or falls back to "User".
  const { displayName, authState } = useAuth();

  const [welcomeToast, setWelcomeToast] = useState('');
  // Start with empty array — NO mock data fallback
  const [listings, setListings] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // College name: also needs defensive handling for old users
  const userCollege = (() => {
    try {
      const val =
        authState?.college ||
        localStorage.getItem('userCollegeName') ||
        localStorage.getItem('userCollege') ||
        localStorage.getItem('selectedCollegeName') ||
        localStorage.getItem('selectedCollege');
      if (val && val !== 'undefined' && val !== 'null' && val.trim()) {
        return val.trim();
      }
    } catch {}
    return 'Your College';
  })();

  const nearbyListings = useNearbyPGs(listings, selectedCollege);

  useEffect(() => {
    const controller = new AbortController();

    const collegeFromStorage = {
      id: localStorage.getItem('userCollegeId') || localStorage.getItem('selectedCollegeId') || '',
      name: userCollege,
      latitude: Number(localStorage.getItem('selectedCollegeLatitude')),
      longitude: Number(localStorage.getItem('selectedCollegeLongitude')),
    };

    if (
      Number.isFinite(collegeFromStorage.latitude) &&
      Number.isFinite(collegeFromStorage.longitude)
    ) {
      setSelectedCollege(collegeFromStorage);
      return () => controller.abort();
    }

    if (!collegeFromStorage.id) {
      setSelectedCollege(null);
      return () => controller.abort();
    }

    getCollegeById(collegeFromStorage.id, { signal: controller.signal })
      .then((college) => {
        if (controller.signal.aborted) return;
        setSelectedCollege(college);
        localStorage.setItem('selectedCollege', college.name);
        localStorage.setItem('selectedCollegeName', college.name);
        localStorage.setItem('userCollegeName', college.name);
        localStorage.setItem('selectedCollegeLatitude', String(college.latitude));
        localStorage.setItem('selectedCollegeLongitude', String(college.longitude));
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === 'AbortError') return;
        console.warn('Home: selected college lookup failed:', err);
        setSelectedCollege(null);
      });

    return () => controller.abort();
  }, [userCollege]);

  // AbortController ref for cleanup on unmount
  const abortRef = useRef(null);

  // ── Fetch real PG listings from Supabase ────────────────────────────
  const loadListings = async (signal) => {
    try {
      setError(null);
      const { data, error: fetchError, aborted } = await fetchPGListings({ signal });

      // If the request was aborted (component unmounted), don't update state
      if (aborted) return;

      if (fetchError) {
        console.error('Home: fetchPGListings error:', fetchError);
        setError(fetchError.message || 'Failed to load listings');
        return;
      }

      // Set whatever we got — even if empty
      setListings(data || []);

      if (data?.length === 0) {
        console.log('ℹ️ Home: no PG listings in database yet');
      }
    } catch (err) {
      // Don't set error state if the component was unmounted
      if (signal?.aborted) return;
      console.error('Home: unexpected error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      // Only update loading state if not aborted
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Create a new AbortController for this effect
    const controller = new AbortController();
    abortRef.current = controller;

    loadListings(controller.signal);

    // Real-time: auto-refresh when a provider adds a new PG
    const unsubscribe = subscribeToPGChanges(() => {
      // Only reload if the component is still mounted
      if (!controller.signal.aborted) {
        loadListings(controller.signal);
      }
    });

    // Cleanup: abort pending fetches and unsubscribe from real-time
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, []);

  // ── Retry handler ──────────────────────────────────────────────────
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    loadListings(controller.signal);
  };

  // ── Show welcome-back toast for returning users ──────────────────────
  useEffect(() => {
    if (location.state?.welcomeBack && location.state?.name) {
      setWelcomeToast(`Welcome back ${location.state.name} 👋`);
      const timer = setTimeout(() => setWelcomeToast(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // ── Filtered sections ─────────────────────────────────────────────────
  const nearCampus = nearbyListings.filter(l => Number.isFinite(l?.distanceKm) && l.distanceKm <= 1);
  const budgetFriendly = nearbyListings.filter(l => (l?.price || 99999) <= 7000);
  const withFood = nearbyListings.filter(l => l?.services?.includes('food'));

  // If filtered sections are empty, show first few listings from the real data
  const nearCampusFinal = nearCampus.length > 0 ? nearCampus : nearbyListings.slice(0, 3);
  const budgetFinal = budgetFriendly.length > 0 ? budgetFriendly : nearbyListings.slice(0, 3);
  const withFoodFinal = withFood.length > 0 ? withFood : nearbyListings.slice(0, 3);

  // ── Time-based greeting ───────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // ── Safe greeting text ────────────────────────────────────────────────
  // NEVER render undefined/null/empty in the greeting.
  // displayName from AuthContext is already sanitized, but double-check here.
  const safeUserName = displayName && displayName !== 'undefined' && displayName !== 'null'
    ? displayName
    : 'there';

  return (
    <div className="page" id="home-screen">

      {/* Welcome-back toast */}
      {welcomeToast && (
        <div className="welcome-toast">{welcomeToast}</div>
      )}

      <div className="home-header">
        <div className="home-header-top">
          <div>
            <p className="home-greeting">{greeting}, {safeUserName} 👋</p>
            <h1 className="home-college">Nearby {userCollege}</h1>
          </div>
          <button className="home-notif" onClick={() => navigate('/notifications')}>
            <Bell size={20} />
            <span className="notif-dot" />
          </button>
        </div>
        <div className="home-search-row">
          <div style={{ flex: 1 }} onClick={() => navigate('/search')}>
            <SearchBar placeholder="Search PGs, rooms near campus..." />
          </div>
          <button className="home-filter-btn" onClick={() => navigate('/search')}>
            <SlidersHorizontal size={18} />
          </button>
        </div>
        <div className="college-badge">🎓 Only for {userCollege} students</div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="home-loading">
          <Loader size={24} className="spinning" />
          <span>Loading PGs...</span>
        </div>
      )}

      {/* Error state with retry */}
      {!loading && error && (
        <div className="home-error">
          <AlertCircle size={24} />
          <p>{error}</p>
          <button className="retry-btn" onClick={handleRetry}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      )}

      {/* Empty state — no PGs in database */}
      {!loading && !error && listings.length === 0 && (
        <div className="home-empty">
          <div className="home-empty-icon">🏠</div>
          <h3>No PGs listed yet</h3>
          <p>Check back soon — new listings are added daily!</p>
        </div>
      )}

      {/* Only show sections if we have listings */}
      {nearbyListings.length > 0 && (
        <>
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">📍 Near Campus</h2>
              <button className="section-link" onClick={() => navigate('/search')}>See all</button>
            </div>
            <div className="horizontal-scroll">
              {nearCampusFinal.map(l => <ListingCard key={l.id} listing={l} variant="horizontal" />)}
            </div>
          </div>

          <div className="section">
            <div className="section-header">
              <h2 className="section-title">💰 Budget Friendly</h2>
              <button className="section-link" onClick={() => navigate('/search')}>See all</button>
            </div>
            <div className="horizontal-scroll">
              {budgetFinal.map(l => <ListingCard key={l.id} listing={l} variant="horizontal" />)}
            </div>
          </div>

          <div className="section">
            <div className="section-header">
              <h2 className="section-title">🍽️ With Food</h2>
              <button className="section-link" onClick={() => navigate('/search')}>See all</button>
            </div>
            <div className="horizontal-scroll">
              {withFoodFinal.map(l => <ListingCard key={l.id} listing={l} variant="horizontal" />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
