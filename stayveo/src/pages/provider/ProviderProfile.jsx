import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Shield, MapPin, CreditCard, ChevronRight, LogOut } from 'lucide-react';
import { brokerData, providerTypes } from '../../data/mockData';
import './ProviderProfile.css';

export default function ProviderProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const types = location.state?.types || ['pg'];

  const menuItems = [
    { icon: '📋', label: 'Business Details', desc: 'Name, address, contact' },
    { icon: '📍', label: 'Service Area', desc: '2 km radius around location' },
    { icon: '🛡️', label: 'Verification', desc: 'Pending review', badge: '⏳' },
    { icon: '🏦', label: 'Bank Details', desc: 'Add/update payment info' },
    { icon: '📊', label: 'Reports', desc: 'Download business reports' },
    { icon: '❓', label: 'Help & Support', desc: 'Get help from our team' },
  ];

  return (
    <div className="pp-page" id="provider-profile">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard', { state: { types } })}>
          <ArrowLeft size={20} />
        </button>
        <h1>Profile</h1>
      </div>

      <div className="pp-profile-card">
        <div className="pp-avatar">👤</div>
        <div className="pp-info">
          <h2>{brokerData.name}</h2>
          <p>{brokerData.phone}</p>
          <div className="pp-types">
            {types.map(t => {
              const info = providerTypes.find(p => p.key === t);
              return <span key={t} className="pp-type-tag" style={{ background: info.bgColor, color: info.color }}>{info.emoji} {info.label}</span>;
            })}
          </div>
        </div>
        <div className="pp-verify-badge">
          <Shield size={14} />
          <span>Pending</span>
        </div>
      </div>

      <div className="pp-stats-bar">
        <div className="pp-stat-mini"><span className="pp-stat-val">{brokerData.activeListings}</span><span>Active</span></div>
        <div className="pp-stat-divider" />
        <div className="pp-stat-mini"><span className="pp-stat-val">{brokerData.totalBookings}</span><span>Bookings</span></div>
        <div className="pp-stat-divider" />
        <div className="pp-stat-mini"><span className="pp-stat-val">₹{(brokerData.totalEarnings / 1000).toFixed(0)}k</span><span>Earned</span></div>
      </div>

      <div className="pp-menu">
        {menuItems.map((item, i) => (
          <button key={i} className="pp-menu-item">
            <span className="pp-menu-icon">{item.icon}</span>
            <div className="pp-menu-content">
              <h3>{item.label}</h3>
              <p>{item.desc}</p>
            </div>
            {item.badge ? (
              <span className="pp-menu-badge">{item.badge}</span>
            ) : (
              <ChevronRight size={16} className="pp-menu-chevron" />
            )}
          </button>
        ))}
      </div>

      <button className="pp-logout" onClick={() => navigate('/')}>
        <LogOut size={18} /> Log Out
      </button>
    </div>
  );
}
