import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  CheckCircle2,
  LogOut,
  BarChart3,
  Star,
  Eye,
  IndianRupee,
  Home,
  ClipboardList,
  Inbox,
  Package,
  Wrench,
  BedDouble,
} from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { getProviderDashboardStats } from '../../api/booking';
import Button from '../../components/Button';
import './ProviderDashboard.css';

const SERVICE_META = {
  PG: { icon: Home, label: 'PG / Hostel' },
  TIFFIN: { icon: Package, label: 'Tiffin' },
};

function safeNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { provider, clearProvider } = useProvider();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const providerName = provider?.name ?? 'Provider';
  const firstName = providerName.split(' ')[0] || 'Provider';
  const services = Array.isArray(provider?.services) ? provider.services : [];
  const providerId = provider?.providerId ?? '';

  useEffect(() => {
    if (!providerId) {
      queueMicrotask(() => setLoading(false));
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const totalBookings = safeNumber(stats?.bookings?.confirmed ?? stats?.bookings?.accepted);
  const newBookings = safeNumber(stats?.bookings?.new);
  const profileViews = safeNumber(stats?.profileViews?.total);
  const totalEarnings = safeNumber(stats?.bookings?.thisMonthRevenue);
  const servicesCount = services.length;
  const performanceMessage = newBookings > 0
    ? `${newBookings} new booking request${newBookings === 1 ? '' : 's'} need your review.`
    : 'Your provider workspace is up to date this week.';

  const dashboardStats = [
    {
      icon: <BarChart3 size={22} />,
      value: loading ? '...' : totalBookings,
      label: 'Total Bookings',
      badge: newBookings > 0 ? `${newBookings} new` : 'Updated',
      action: () => navigate('/provider/bookings'),
    },
    {
      icon: <Star size={22} />,
      value: '--',
      label: 'Average Rating',
      badge: provider?.isVerified ? 'Verified' : 'Pending',
    },
    // {
    //   icon: <Eye size={22} />,
    //   value: loading ? '...' : profileViews,
    //   label: 'Visit Requests',
    //   badge: 'Live',
    // },
    {
      icon: <IndianRupee size={22} />,
      value: `₹${loading ? '...' : totalEarnings.toLocaleString('en-IN')}`,
      label: 'This Month',
      badge: 'Revenue',
      action: () => navigate('/provider/earnings'),
    },
  ];

  const toolboxActions = [
    {
      icon: <BedDouble size={20} />,
      label: 'Manage Beds',
      action: () => navigate('/provider/manage-beds'),
    },
    {
      icon: <Inbox size={20} />,
      label: 'View Requests',
      action: () => navigate('/provider/bookings'),
    },
    {
      icon: <Wrench size={20} />,
      label: 'Manage Services',
      action: () => navigate('/provider/services'),
    },
  ];

  const activities = [
    {
      icon: <CheckCircle2 size={18} />,
      title: 'Account created',
      description: 'Your provider profile is live.',
      time: 'Just now',
    },
    ...services.map((svc) => ({
      icon: <Package size={18} />,
      title: `${SERVICE_META?.[svc]?.label ?? svc} added`,
      description: 'Service details saved.',
      time: 'Today',
    })),
    ...(newBookings > 0
      ? [{
        icon: <ClipboardList size={18} />,
        title: `${newBookings} new booking${newBookings > 1 ? 's' : ''}`,
        description: 'Tap to review the latest booking activity.',
        time: 'Now',
      }]
      : []),
  ];

  return (
    <div className="pd-content-wrap" id="provider-dashboard">
      <main className="pd-main">
        <section className="pd-header" aria-labelledby="provider-welcome-title">
          <div className="pd-header-left">
            <h1 id="provider-welcome-title" className="pd-greeting">{greeting}, {firstName}</h1>
            <p className="pd-subtitle">{performanceMessage}</p>
            <div className="pd-type-badges" aria-label="Provider service category">
              <span className="pd-type-badge pd-service-pg">
                <Home size={12} /> PG
              </span>
            </div>
          </div>
        </section>

        <section className="pd-stats" aria-label="Provider statistics">
          {dashboardStats.map((item) => (
            <article
              className={`pd-stat ${item.action ? 'pd-stat-clickable' : ''}`}
              key={item.label}
              onClick={item.action}
              onKeyDown={(event) => {
                if (!item.action) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  item.action();
                }
              }}
              role={item.action ? 'button' : undefined}
              tabIndex={item.action ? 0 : undefined}
            >
              <div className="pd-stat-top">
                <span className="pd-stat-icon">{item.icon}</span>
                <span className="pd-stat-badge">{item.badge}</span>
              </div>
              <span className="pd-stat-value">{item.value}</span>
              <span className="pd-stat-label">{item.label}</span>
            </article>
          ))}
        </section>

        <section className="pd-content-grid">
          <article className="pd-activity-card">
            <div className="pd-section-heading">
              <h2>Recent Activity</h2>
              {/* <button className="pd-link-btn" type="button" onClick={() => navigate('/provider/bookings')}>
                View all reports
              </button> */}
            </div>

            <div className="pd-activity-list">
              {activities.map((activity, index) => (
                <div className="pd-activity" key={`${activity.title}-${index}`}>
                  <span className="pd-activity-icon">{activity.icon}</span>
                  <div>
                    <strong>{activity.title}</strong>
                    <p>{activity.description}</p>
                  </div>
                  <span className="pd-activity-time">{activity.time}</span>
                </div>
              ))}
            </div>
          </article>

          <aside className="pd-toolbox" aria-labelledby="provider-toolbox-title">
            <h2 id="provider-toolbox-title">Owner Toolbox</h2>
            <div className="pd-actions">
              {toolboxActions.map((item) => (
                <button className="pd-action" type="button" key={item.label} onClick={item.action}>
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </aside>
        </section>

        <div className="pd-logout-row">
          <Button variant="ghost" fullWidth onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </main>
    </div>
  );
}
