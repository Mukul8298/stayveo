// ─── Provider Profile Page ────────────────────────────────────────────────
// This is the top-level profile dashboard a provider sees after onboarding.
//
// WHY we removed static mock data:
//   Mock data creates a false impression of a working system. Providers
//   seeing fake earnings/bookings numbers lose trust in the platform.
//   Real data also enables notifications, analytics, and payout triggers.
//
// STATE MANAGEMENT PATTERN used here:
//   1. On mount → useEffect fires → calls API → sets state
//   2. Loading skeleton shown while fetching (never a blank screen)
//   3. Error state falls back gracefully to zeros (never crashes)
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CreditCard, ChevronRight, LogOut, Building2, HelpCircle, Loader2 } from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { getProviderDashboardStats } from '../../api/provider';
import { providerTypes } from '../../data/mockData';
import './ProviderProfile.css';

export default function ProviderProfile() {
  const navigate = useNavigate();
  const { provider, clearProvider } = useProvider();

  // ── Stats state ─────────────────────────────────────────────────────────
  // We start with null to distinguish "not yet fetched" from "fetched as 0".
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Fetch real stats on mount ────────────────────────────────────────────
  // useEffect with [] runs exactly once when the component mounts.
  // This is the standard React pattern for initial data fetching.
  useEffect(() => {
    if (!provider.phone) return; // Guard: no phone = can't fetch

    let cancelled = false; // Cleanup flag to prevent state update on unmount

    async function fetchStats() {
      try {
        setStatsLoading(true);
        const res = await getProviderDashboardStats(provider.phone);
        if (!cancelled) setStats(res.data);
      } catch {
        // Silently fall back — dashboard still renders with 0s
        if (!cancelled) setStats({ activeListings: 0, totalBookings: 0, totalEarnings: 0 });
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }

    fetchStats();
    return () => { cancelled = true; }; // Cleanup on unmount
  }, [provider.phone]);

  // ── Service type badges ──────────────────────────────────────────────────
  // provider.services comes from ProviderContext (set during onboarding).
  // We map the saved service keys to their display metadata.
  const serviceTypes = (provider.services || [])
    .map(key => providerTypes.find(p => p.key === key.toLowerCase()))
    .filter(Boolean);

  // ── Menu items ───────────────────────────────────────────────────────────
  // WHY we removed Verification + Reports:
  //   "Zombie UI" — sections that exist in the UI but go nowhere create
  //   confusion and broken user journeys. Senior engineers remove dead
  //   features immediately rather than leaving them as placeholders.
  //   We'll re-add Verification only when real document upload is built.
  const menuItems = [
    {
      icon: <Building2 size={20} />,
      label: 'Business Details',
      desc: 'Name, address, contact',
      path: '/provider/business-details',
      color: '#6366F1',
    },
    {
      icon: <MapPin size={20} />,
      label: 'Service Area',
      desc: '2 km radius around location',
      path: null, // Coming soon — no dead navigation
      color: '#EA580C',
    },
    {
      icon: <CreditCard size={20} />,
      label: 'Bank Details',
      desc: 'Add / update payment info',
      path: null,
      color: '#16A34A',
    },
    {
      icon: <HelpCircle size={20} />,
      label: 'Help & Support',
      desc: 'Contact founder & FAQ',
      path: '/provider/help',
      color: '#0EA5E9',
    },
  ];

  // ── Logout ───────────────────────────────────────────────────────────────
  // clearProvider() wipes localStorage + resets ProviderContext to INITIAL_STATE.
  // Without this, a provider who logs out would see the previous session's
  // data if another provider logs in on the same device.
  function handleLogout() {
    clearProvider();
    navigate('/provider/login', { replace: true });
  }

  // ── Earnings display helper ──────────────────────────────────────────────
  function formatEarnings(amount) {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}k`;
    return `₹${amount}`;
  }

  return (
    <div className="pp-page" id="provider-profile">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Profile</h1>
      </div>

      {/* ── Profile Card ──────────────────────────────────────────── */}
      {/* Name + Phone come from ProviderContext (set after OTP + basic-info) */}
      <div className="pp-profile-card">
        <div className="pp-avatar">
          {provider.name ? provider.name.charAt(0).toUpperCase() : '👤'}
        </div>
        <div className="pp-info">
          <h2>{provider.name || 'Provider'}</h2>
          <p>{provider.phone || '—'}</p>
          <div className="pp-types">
            {serviceTypes.length > 0 ? (
              serviceTypes.map(info => (
                <span
                  key={info.key}
                  className="pp-type-tag"
                  style={{ background: info.bgColor, color: info.color }}
                >
                  {info.emoji} {info.label}
                </span>
              ))
            ) : (
              <span className="pp-type-tag" style={{ background: '#F1F5F9', color: '#64748B' }}>
                No services
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Bar ─────────────────────────────────────────────── */}
      {/* Shows a pulsing skeleton while fetching, real data once loaded. */}
      <div className="pp-stats-bar">
        {statsLoading ? (
          <div className="pp-stats-loading">
            <Loader2 size={16} className="pp-stats-spinner" />
            <span>Loading stats…</span>
          </div>
        ) : (
          <>
            <div className="pp-stat-mini">
              <span className="pp-stat-val">{stats?.activeListings ?? 0}</span>
              <span>Active</span>
            </div>
            <div className="pp-stat-divider" />
            <div className="pp-stat-mini">
              <span className="pp-stat-val">{stats?.totalBookings ?? 0}</span>
              <span>Bookings</span>
            </div>
            <div className="pp-stat-divider" />
            <div className="pp-stat-mini">
              <span className="pp-stat-val">{formatEarnings(stats?.totalEarnings ?? 0)}</span>
              <span>Earned</span>
            </div>
          </>
        )}
      </div>

      {/* ── Menu ──────────────────────────────────────────────────── */}
      <div className="pp-menu">
        {menuItems.map((item, i) => (
          <button
            key={i}
            className={`pp-menu-item${!item.path ? ' pp-menu-item--disabled' : ''}`}
            onClick={() => item.path && navigate(item.path)}
            disabled={!item.path}
          >
            <span className="pp-menu-icon" style={{ color: item.color }}>
              {item.icon}
            </span>
            <div className="pp-menu-content">
              <h3>{item.label}</h3>
              <p>{item.desc}</p>
            </div>
            {item.path ? (
              <ChevronRight size={16} className="pp-menu-chevron" />
            ) : (
              <span className="pp-menu-soon">Soon</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Logout ────────────────────────────────────────────────── */}
      <button className="pp-logout" onClick={handleLogout}>
        <LogOut size={18} /> Log Out
      </button>
    </div>
  );
}
