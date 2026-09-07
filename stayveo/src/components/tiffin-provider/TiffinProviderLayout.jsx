import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChefHat,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Settings,
  Truck,
  Users,
} from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import './TiffinProvider.css';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/provider/tiffin/dashboard', icon: LayoutDashboard },
  { label: 'Customers', path: '/provider/tiffin/customers', icon: Users },
  { label: "Today's Deliveries", path: '/provider/tiffin/deliveries', icon: Truck },
  { label: 'Menu', path: '/provider/tiffin/menu', icon: ChefHat },
  { label: 'Reports', path: '/provider/tiffin/reports', icon: BarChart3 },
  { label: 'Settings', path: '/provider/tiffin/settings', icon: Settings },
];

function isActive(pathname, itemPath) {
  if (itemPath.endsWith('/dashboard')) return pathname === itemPath;
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export default function TiffinProviderLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { provider, clearProvider, updateProvider } = useProvider();
  const displayName = provider.name || 'Tiffin Provider';
  const initial = displayName.charAt(0).toUpperCase();

  function logout() {
    clearProvider();
    navigate('/provider/login', { replace: true });
  }

  function openSettings() {
    updateProvider({ activeServiceType: 'TIFFIN' });
    navigate('/provider/tiffin/settings');
  }

  return (
    <div className="tp-shell" id="tiffin-provider-layout">
      <aside className="tp-sidebar" aria-label="Tiffin provider navigation">
        <div>
          <div className="tp-brand">
            <strong>StayVeo</strong>
            <span>PREMIUM TIFFIN SUITE</span>
          </div>
          <nav className="tp-sidebar-nav">
            {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
              const active = isActive(location.pathname, path);
              return (
                <button
                  key={path}
                  type="button"
                  className={`tp-nav-item${active ? ' is-active' : ''}`}
                  onClick={() => (path === '/provider/tiffin/settings' ? openSettings() : navigate(path))}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="tp-sidebar-footer">
          <button type="button" className="tp-nav-item" onClick={openSettings}>
            <CircleHelp size={19} />
            <span>Help</span>
          </button>
          <button type="button" className="tp-nav-item" onClick={logout}>
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="tp-main">
        <header className="tp-topbar">
          <div className="tp-mobile-brand">StayVeo</div>
          <div className="tp-topbar-actions">
            <button type="button" className="tp-icon-button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <div className="tp-avatar" aria-hidden="true">{initial}</div>
          </div>
        </header>

        <main className="tp-content"><Outlet /></main>
      </div>

      <nav className="tp-bottom-nav" aria-label="Tiffin provider mobile navigation">
        {NAV_ITEMS.slice(0, 5).map(({ label, path, icon: Icon }) => {
          const active = isActive(location.pathname, path);
          return (
            <button
              key={path}
              type="button"
              className={`tp-bottom-item${active ? ' is-active' : ''}`}
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={19} />
              <span>{label === "Today's Deliveries" ? 'Deliveries' : label}</span>
            </button>
          );
        })}
        <button type="button" className="tp-bottom-item" onClick={openSettings} aria-label="Settings">
          <Settings size={19} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
