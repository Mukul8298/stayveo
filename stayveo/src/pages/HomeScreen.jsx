import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, SlidersHorizontal } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import ListingCard from '../components/ListingCard';
import { listings } from '../data/mockData';
import './HomeScreen.css';

export default function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [welcomeToast, setWelcomeToast] = useState('');

  const userName = localStorage.getItem('userName') || 'there';
  const userCollege = localStorage.getItem('userCollege') || 'Your College';

  const nearCampus = listings.filter(l => l.distance <= 0.5);
  const budgetFriendly = listings.filter(l => l.price <= 7000);
  const withFood = listings.filter(l => l.services.includes('food'));

  // ── Show welcome-back toast for returning users ───────────────────────
  useEffect(() => {
    if (location.state?.welcomeBack && location.state?.name) {
      setWelcomeToast(`Welcome back ${location.state.name} 👋`);
      const timer = setTimeout(() => setWelcomeToast(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

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

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">📍 Near Campus</h2>
          <button className="section-link" onClick={() => navigate('/search')}>See all</button>
        </div>
        <div className="horizontal-scroll">
          {nearCampus.map(l => <ListingCard key={l.id} listing={l} variant="horizontal" />)}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">💰 Budget Friendly</h2>
          <button className="section-link" onClick={() => navigate('/search')}>See all</button>
        </div>
        <div className="horizontal-scroll">
          {budgetFriendly.map(l => <ListingCard key={l.id} listing={l} variant="horizontal" />)}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">🍽️ With Food</h2>
          <button className="section-link" onClick={() => navigate('/search')}>See all</button>
        </div>
        <div className="horizontal-scroll">
          {withFood.map(l => <ListingCard key={l.id} listing={l} variant="horizontal" />)}
        </div>
      </div>
    </div>
  );
}
