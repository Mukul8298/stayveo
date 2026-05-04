import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Plus, TrendingUp, ChevronRight, Clock, Shield } from 'lucide-react';
import { dashboardData, providerTypes, providerEarningsData, brokerData } from '../../data/mockData';
import './ProviderDashboard.css';

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedTypes = location.state?.types || ['pg'];
  const primaryType = selectedTypes[0];
  const data = dashboardData[primaryType];
  const typeInfo = providerTypes.find(t => t.key === primaryType);

  return (
    <div className="pd-page" id="provider-dashboard">
      {/* Header */}
      <div className="pd-header">
        <div className="pd-header-left">
          <p className="pd-greeting">Good evening 👋</p>
          <h1>{brokerData.name}</h1>
          <div className="pd-type-badges">
            {selectedTypes.map(t => {
              const info = providerTypes.find(p => p.key === t);
              return (
                <span key={t} className="pd-type-badge" style={{ background: info.bgColor, color: info.color }}>
                  {info.emoji} {info.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="pd-header-right">
          <button className="pd-notif-btn" onClick={() => navigate('/provider/notifications')}>
            <Bell size={20} />
            <span className="pd-notif-dot" />
          </button>
        </div>
      </div>

      {/* Verification Banner */}
      <div className="pd-verify-banner">
        <Clock size={16} />
        <span>Verification pending</span>
        <Shield size={14} />
      </div>

      {/* Earnings Card */}
      <div className="pd-earnings" onClick={() => navigate('/provider/earnings', { state: { types: selectedTypes } })}>
        <div className="pd-earnings-label"><TrendingUp size={16} /> Today's Earnings</div>
        <div className="pd-earnings-amount">₹{providerEarningsData.today.toLocaleString()}</div>
        <div className="pd-earnings-row">
          <span>This Month: ₹{providerEarningsData.thisMonth.toLocaleString()}</span>
          <ChevronRight size={16} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="pd-stats">
        {data.stats.map((stat, i) => (
          <div key={i} className="pd-stat" style={{ animationDelay: `${i * 0.06}s` }}>
            <span className="pd-stat-icon">{stat.icon}</span>
            <span className="pd-stat-value">{stat.value}</span>
            <span className="pd-stat-label">{stat.label}</span>
            <span className="pd-stat-change">{stat.change}</span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="pd-section">
        <h2 className="pd-section-title">Quick Actions</h2>
        <div className="pd-actions">
          {data.quickActions.map((action, i) => (
            <button key={i} className="pd-action" onClick={() => {
              if (action.includes('Request') || action.includes('Order') || action.includes('Pickup') || action.includes('Schedule'))
                navigate('/provider/bookings', { state: { types: selectedTypes } });
              else if (action.includes('Add') || action.includes('Update') || action.includes('Pricing'))
                navigate('/provider/services', { state: { types: selectedTypes } });
              else if (action.includes('Calendar') || action.includes('Route'))
                navigate('/provider/calendar', { state: { types: selectedTypes } });
            }}>
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="pd-section">
        <h2 className="pd-section-title">Recent Activity</h2>
        <div className="pd-activity-list">
          <div className="pd-activity"><span className="pd-activity-dot pd-dot-green" /><div><strong>New booking</strong><p>Aarav Mehta • Room 3</p></div><span className="pd-activity-time">2m ago</span></div>
          <div className="pd-activity"><span className="pd-activity-dot pd-dot-blue" /><div><strong>Payment received</strong><p>₹2,800 from Priya Singh</p></div><span className="pd-activity-time">1h ago</span></div>
          <div className="pd-activity"><span className="pd-activity-dot pd-dot-orange" /><div><strong>Service completed</strong><p>Deep cleaning for Vikram</p></div><span className="pd-activity-time">3h ago</span></div>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="pd-nav">
        <button className="pd-nav-item pd-nav-active" onClick={() => navigate('/provider/dashboard', { state: { types: selectedTypes } })}>
          <span>📊</span><span>Dashboard</span>
        </button>
        <button className="pd-nav-item" onClick={() => navigate('/provider/bookings', { state: { types: selectedTypes } })}>
          <span>📋</span><span>Bookings</span>
        </button>
        <button className="pd-nav-fab" onClick={() => navigate('/provider/services', { state: { types: selectedTypes } })}>
          <Plus size={24} />
        </button>
        <button className="pd-nav-item" onClick={() => navigate('/provider/calendar', { state: { types: selectedTypes } })}>
          <span>📅</span><span>Calendar</span>
        </button>
        <button className="pd-nav-item" onClick={() => navigate('/provider/profile', { state: { types: selectedTypes } })}>
          <span>👤</span><span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
