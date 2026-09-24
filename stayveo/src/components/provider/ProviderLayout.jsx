// ─── Provider Layout (Shared Shell) ─────────────────────────────────────
// Single source of truth for the provider dashboard shell:
//   - Desktop sidebar (fixed, 260px)
//   - Desktop top header (sticky, 72px)
//   - Mobile bottom nav
//   - <Outlet /> for page content
//
// WHY:
//   Previously every provider page duplicated its own sidebar, header,
//   and bottom nav. This caused visual jumps (different CSS prefixes,
//   different branding text, different header layouts). This component
//   eliminates all that duplication.
//
// NO BUSINESS LOGIC CHANGES — this is purely a layout extraction.
// ─────────────────────────────────────────────────────────────────────────

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Wrench,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  ArrowLeft,
  BarChart3,
  Search,
  House,
} from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { providerLogout } from '../../api/provider';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import ProviderAuthGate from './ProviderAuthGate';
import './ProviderLayout.css';

// ── Page title mapping ─────────────────────────────────────────────────
// Maps the current pathname to the title shown in the desktop header.
const PAGE_TITLES = {
  '/provider/dashboard': 'Dashboard',
  '/provider/bookings': 'Bookings',
  '/provider/add-property': 'Add Property',
  '/provider/listing/create': 'Add Property',
  '/provider/services': 'Services',
  '/provider/manage-beds': 'Manage Beds',
  '/provider/settings': 'Settings',
  '/provider/settings/business-details': 'Business Details',
  '/provider/settings/bank-details': 'Bank Details',
  '/provider/tiffin/settings': 'Settings',
  '/provider/tiffin/settings/business-details': 'Business Details',
  '/provider/tiffin/settings/bank-details': 'Bank Details',
  '/provider/settings/help': 'Help & Support',
  '/provider/settings/legal': 'Legal & Privacy',
  '/provider/requests': 'Requests',
  '/provider/calendar': 'Calendar',
  '/provider/earnings': 'Earnings',
  '/provider/reports': 'Reports',
  '/provider/notifications': 'Notifications',
};

// ── Sub-pages that show a back button in the desktop header ────────────
const SUB_PAGES = [
  '/provider/settings/business-details',
  '/provider/settings/bank-details',
  '/provider/tiffin/settings/business-details',
  '/provider/tiffin/settings/bank-details',
  '/provider/settings/help',
  '/provider/settings/legal',
  '/provider/notifications',
  '/provider/requests',
  '/provider/calendar',
  '/provider/earnings',
];

// ── Sidebar nav items ──────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/provider/dashboard' },
  { icon: ClipboardList, label: 'Bookings', path: '/provider/bookings' },
  { icon: PlusCircle, label: 'Add Property', path: '/provider/add-property' },
  { icon: Wrench, label: 'Services', path: '/provider/services' },
  { icon: Settings, label: 'Settings', path: '/provider/settings' },
];

// ── Which sidebar item is "active" for a given path ────────────────────
function getActiveSidebarPath(pathname) {
  // Sub-pages of settings highlight the Settings item
  if (pathname.startsWith('/provider/settings') || pathname.startsWith('/provider/tiffin/settings')) return '/provider/settings';
  // Listing create/edit → Add Property
  if (pathname.startsWith('/provider/listing')) return '/provider/add-property';
  // Service create/edit → Services
  if (pathname.startsWith('/provider/services/')) return '/provider/services';
  // Direct match
  const matched = SIDEBAR_ITEMS.find((item) => item.path === pathname);
  return matched ? matched.path : '';
}

// ── Which bottom-nav item is "active" ──────────────────────────────────
function getActiveNavKey(pathname) {
  if (pathname.startsWith('/provider/settings') || pathname.startsWith('/provider/tiffin/settings')) return 'settings';
  if (pathname.startsWith('/provider/listing') || pathname === '/provider/add-property') return 'add';
  if (pathname.startsWith('/provider/services')) return 'services';
  if (pathname === '/provider/reports') return 'reports';
  if (pathname === '/provider/bookings') return 'bookings';
  if (pathname === '/provider/dashboard') return 'dashboard';
  return '';
}

export default function ProviderLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { provider, clearProvider } = useProvider();
  const pathname = location.pathname;
  const { unreadCount } = useRealtimeNotifications(provider.userId || provider.user_id);

  const providerName = provider.name || 'Provider';
  const firstName = providerName.split(' ')[0] || 'Provider';
  const activeSidebarPath = getActiveSidebarPath(pathname);
  const activeNavKey = getActiveNavKey(pathname);
  const isSubPage = SUB_PAGES.some((p) => pathname.startsWith(p)) ||
    (pathname.includes('/listing/') && pathname.endsWith('/edit')) ||
    (pathname.includes('/services/') && (pathname.endsWith('/create') || pathname.endsWith('/edit')));

  // Resolve page title — handle dynamic segments like /listing/:id/edit
  let pageTitle = PAGE_TITLES[pathname];
  if (!pageTitle) {
    if (pathname.includes('/listing/') && pathname.endsWith('/edit')) {
      pageTitle = 'Edit Listing';
    } else if (pathname.includes('/services/') && pathname.endsWith('/create')) {
      pageTitle = 'Create Service';
    } else if (pathname.includes('/services/') && pathname.endsWith('/edit')) {
      pageTitle = 'Edit Service';
    } else {
      pageTitle = 'StayVeo';
    }
  }

  async function handleLogout() {
    try { await providerLogout(); } finally {
      clearProvider();
      navigate('/provider/login', { replace: true });
    }
  }

  return (
    <div className="pl-page" id="provider-layout">
      {/* ═══ Desktop Sidebar ═══════════════════════════════════════════ */}
      <aside className="pl-sidebar" aria-label="Provider navigation">
        <div>
          <div className="pl-brand">
            <div className="pl-brand-row"><House size={22} strokeWidth={2.1} /><span>StayVeo</span></div>
            <small>Property Management</small>
          </div>

          <nav className="pl-side-nav">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSidebarPath === item.path;
              return (
                <button
                  key={item.path}
                  className={`pl-side-nav-item${isActive ? ' active' : ''}`}
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pl-side-bottom">
          <button
            className="pl-side-nav-item"
            type="button"
            onClick={() => navigate('/provider/settings/help')}
          >
            <HelpCircle size={18} />
            <span>Help</span>
          </button>
          <button className="pl-side-logout" type="button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ═══ Main Shell ════════════════════════════════════════════════ */}
      <div className="pl-shell">
        {/* ─── Top Bar ────────────────────────────────────────────── */}
        <header className={`pl-topbar${isSubPage ? ' pl-topbar--subpage' : ''}`}>
          <div className="pl-topbar-left">
            <div className="pl-search" aria-label="Search provider workspace">
              <Search size={16} />
              <span>Search listings or bookings...</span>
            </div>
            {isSubPage && <button className="pl-topbar-back" onClick={() => navigate(-1)} aria-label={`Back from ${pageTitle}`}><ArrowLeft size={18} /></button>}
            {isSubPage && <span className="pl-topbar-desktop-title pl-topbar-title">{pageTitle}</span>}
            <span className="pl-topbar-mobile-title">StayVeo</span>
          </div>
          <div className="pl-topbar-actions">
            <button
              className="pl-notif-btn"
              onClick={() => navigate('/provider/notifications')}
              aria-label="Open provider notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="pl-notif-dot" />}
            </button>
            <div className="pl-profile">
              <strong className="pl-profile-name">{providerName}</strong>
              <div className="pl-avatar" aria-hidden="true">
                {firstName.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* ─── Page Content ───────────────────────────────────────── */}
        <div className="pl-content">
          <ProviderAuthGate><Outlet /></ProviderAuthGate>
        </div>
      </div>

      {/* ═══ Mobile Bottom Nav ═════════════════════════════════════════ */}
      <nav className="pl-nav" aria-label="Provider mobile navigation">
        <button
          className={`pl-nav-item${activeNavKey === 'dashboard' ? ' pl-nav-active' : ''}`}
          onClick={() => navigate('/provider/dashboard')}
          aria-label="Dashboard"
          aria-current={activeNavKey === 'dashboard' ? 'page' : undefined}
        >
          <span><BarChart3 size={21} /></span>
          <span>Dashboard</span>
        </button>
        <button
          className={`pl-nav-item${activeNavKey === 'bookings' ? ' pl-nav-active' : ''}`}
          onClick={() => navigate('/provider/bookings')}
          aria-label="Bookings"
          aria-current={activeNavKey === 'bookings' ? 'page' : undefined}
        >
          <span><ClipboardList size={21} /></span>
          <span>Bookings</span>
        </button>
        <button
          className={`pl-nav-item${activeNavKey === 'services' ? ' pl-nav-active' : ''}`}
          onClick={() => navigate('/provider/services')}
          aria-label="Services"
          aria-current={activeNavKey === 'services' ? 'page' : undefined}
        >
          <span><Wrench size={21} /></span>
          <span>Services</span>
        </button>
        <button
          className={`pl-nav-item${activeNavKey === 'settings' ? ' pl-nav-active' : ''}`}
          onClick={() => navigate('/provider/settings')}
          aria-label="Settings"
          aria-current={activeNavKey === 'settings' ? 'page' : undefined}
        >
          <span><Settings size={21} /></span>
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
