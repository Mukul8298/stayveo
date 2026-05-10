import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, TrendingUp, ChevronRight, Shield, CheckCircle2, LogOut, Loader } from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { getProviderDashboardStats } from '../../api/booking';
import Button from '../../components/Button';
import './ProviderDashboard.css';

const SERVICE_META = {
  PG:       { emoji: '🏠', label: 'PG / Hostel', color: '#6366F1', bg: '#EEF2FF' },
  TIFFIN:   { emoji: '🍱', label: 'Tiffin',     color: '#F59E0B', bg: '#FFFBEB' },
  LAUNDRY:  { emoji: '🧺', label: 'Laundry',    color: '#06B6D4', bg: '#ECFEFF' },
  CLEANING: { emoji: '🧹', label: 'Cleaning',   color: '#8B5CF6', bg: '#F5F3FF' },
};

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { provider, clearProvider } = useProvider();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const providerName = provider.name || 'Provider';
  const services = provider.services || [];
  const providerId = provider.providerId;

  useEffect(() => {
    if (!providerId) {
      setLoading(false);
      return;
    }
    getProviderDashboardStats(providerId)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [providerId]);

  const handleLogout = () => {
    clearProvider();
    navigate('/role-select');
  };

  // Determine greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const totalBookings = stats?.bookings?.total ?? 0;
  const profileViews = stats?.profileViews?.total ?? 0;
  const totalEarnings = stats?.earnings?.thisMonth ?? 0;

  return (
    <div className="pd-page" id="provider-dashboard">
      {/* Header */}
      <div className="pd-header">
        <div className="pd-header-left">
          <p className="pd-greeting">{greeting} 👋</p>
          <h1>{providerName}</h1>
          <div className="pd-type-badges">
            {services.map((svc) => {
              const meta = SERVICE_META[svc] || { emoji: '📦', label: svc, color: '#64748B', bg: '#F1F5F9' };
              return (
                <span key={svc} className="pd-type-badge" style={{ background: meta.bg, color: meta.color }}>
                  {meta.emoji} {meta.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="pd-header-right">
          <button className="pd-notif-btn" onClick={() => navigate('/provider/notifications')}>
            <Bell size={20} />
            {stats?.bookings?.new > 0 && <span className="pd-notif-dot" />}
          </button>
        </div>
      </div>

      {/* Verification Banner */}
      {provider.isVerified ? (
        <div className="pd-verify-banner pd-verified">
          <CheckCircle2 size={16} />
          <span>Verified Provider</span>
          <Shield size={14} />
        </div>
      ) : (
        <div className="pd-verify-banner">
          <Shield size={16} />
          <span>Verification pending</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="pd-stats">
        <div className="pd-stat" onClick={() => navigate('/provider/bookings')}>
          <span className="pd-stat-icon">📊</span>
          <span className="pd-stat-value">{loading ? '...' : totalBookings}</span>
          <span className="pd-stat-label">Total Bookings</span>
          {stats?.bookings?.new > 0 && (
            <span className="pd-stat-badge">{stats.bookings.new} new</span>
          )}
        </div>
        <div className="pd-stat">
          <span className="pd-stat-icon">⭐</span>
          <span className="pd-stat-value">--</span>
          <span className="pd-stat-label">Rating</span>
        </div>
        <div className="pd-stat">
          <span className="pd-stat-icon">👁️</span>
          <span className="pd-stat-value">{loading ? '...' : profileViews}</span>
          <span className="pd-stat-label">Profile Views</span>
        </div>
        <div className="pd-stat" onClick={() => navigate('/provider/earnings')}>
          <span className="pd-stat-icon">💰</span>
          <span className="pd-stat-value">₹{loading ? '...' : totalEarnings.toLocaleString()}</span>
          <span className="pd-stat-label">This Month</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pd-section">
        <h2 className="pd-section-title">Quick Actions</h2>
        <div className="pd-actions">
          <button className="pd-action" onClick={() => navigate('/provider/services')}>Manage Services</button>
          <button className="pd-action" onClick={() => navigate('/provider/bookings')}>View Bookings</button>
          <button className="pd-action" onClick={() => navigate('/provider/profile')}>Edit Profile</button>
          <button className="pd-action" onClick={() => navigate('/provider/earnings')}>Earnings</button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="pd-section">
        <h2 className="pd-section-title">Recent Activity</h2>
        <div className="pd-activity-list">
          <div className="pd-activity">
            <span className="pd-activity-dot pd-dot-green" />
            <div><strong>Account created</strong><p>Your provider profile is live</p></div>
            <span className="pd-activity-time">Just now</span>
          </div>
          {services.map((svc) => (
            <div key={svc} className="pd-activity">
              <span className="pd-activity-dot pd-dot-blue" />
              <div><strong>{SERVICE_META[svc]?.label || svc} added</strong><p>Service details saved</p></div>
              <span className="pd-activity-time">Today</span>
            </div>
          ))}
          {stats?.bookings?.new > 0 && (
            <div className="pd-activity">
              <span className="pd-activity-dot pd-dot-orange" />
              <div><strong>{stats.bookings.new} new booking{stats.bookings.new > 1 ? 's' : ''}</strong><p>Tap to review</p></div>
              <span className="pd-activity-time">Now</span>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <div style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-6)' }}>
        <Button variant="ghost" fullWidth onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </Button>
      </div>

      {/* Bottom Nav */}
      <nav className="pd-nav">
        <button className="pd-nav-item pd-nav-active" onClick={() => navigate('/provider/dashboard')}>
          <span>📊</span><span>Dashboard</span>
        </button>
        <button className="pd-nav-item" onClick={() => navigate('/provider/bookings')}>
          <span>📋</span><span>Bookings</span>
        </button>
        <button className="pd-nav-fab" onClick={() => navigate('/provider/services')}>
          <Plus size={24} />
        </button>
        <button className="pd-nav-item" onClick={() => navigate('/provider/calendar')}>
          <span>📅</span><span>Calendar</span>
        </button>
        <button className="pd-nav-item" onClick={() => navigate('/provider/profile')}>
          <span>👤</span><span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
