import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, SlidersHorizontal, Loader } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import ListingCard from '../components/ListingCard';
import { listings as mockListings } from '../data/mockData';
import { fetchPGListings, subscribeToPGChanges } from '../api/supabaseApi';
import './HomeScreen.css';

export default function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [welcomeToast, setWelcomeToast] = useState('');
  const [listings, setListings] = useState(mockListings);
  const [loading, setLoading] = useState(true);

  const userName = localStorage.getItem('userName') || 'there';
  const userCollege = localStorage.getItem('userCollege') || 'Your College';

  // ── Fetch real PG listings from Supabase ───────────────────────────────
  const loadListings = async () => {
    try {
      const { data, error } = await fetchPGListings();
      if (error) {
        console.error('Home: fetchPGListings error:', error);
        // Keep mock data as fallback
        return;
      }
      if (data?.length > 0) {
        setListings(data);
      }
      // If no data from DB, keep mock listings
    } catch (err) {
      console.error('Home: unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();

    // Real-time: auto-refresh when a provider adds a new PG
    const unsubscribe = subscribeToPGChanges(() => {
      loadListings();
    });

    return () => unsubscribe();
  }, []);

  // ── Show welcome-back toast for returning users ───────────────────────
  useEffect(() => {
    if (location.state?.welcomeBack && location.state?.name) {
      setWelcomeToast(`Welcome back ${location.state.name} 👋`);
      const timer = setTimeout(() => setWelcomeToast(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // ── Filtered sections ─────────────────────────────────────────────────
  const nearCampus = listings.filter(l => (l?.distance || 99) <= 0.5);
  const budgetFriendly = listings.filter(l => (l?.price || 99999) <= 7000);
  const withFood = listings.filter(l => l?.services?.includes('food'));

  // If filtered sections are empty, show first few listings
  const nearCampusFinal = nearCampus.length > 0 ? nearCampus : listings.slice(0, 3);
  const budgetFinal = budgetFriendly.length > 0 ? budgetFriendly : listings.slice(0, 3);
  const withFoodFinal = withFood.length > 0 ? withFood : listings.slice(0, 3);

  // ── Time-based greeting ───────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page" id="home-screen">

      {/* Welcome-back toast */}
      {welcomeToast && (
        <div className="welcome-toast">{welcomeToast}</div>
      )}

      <div className="home-header">
        <div className="home-header-top">
          <div>
            <p className="home-greeting">{greeting}, {userName} 👋</p>
            <h1 className="home-college">{userCollege}</h1>
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

      {/* Loading skeleton */}
      {loading && (
        <div className="home-loading">
          <Loader size={24} className="spinning" />
          <span>Loading PGs...</span>
        </div>
      )}

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
    </div>
  );
}
