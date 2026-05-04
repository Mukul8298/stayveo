import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Phone, Check, X, Clock } from 'lucide-react';
import { providerBookings } from '../../data/mockData';
import './ProviderBookings.css';

const tabs = ['new', 'accepted', 'in_progress', 'completed'];
const tabLabels = { new: 'New', accepted: 'Accepted', in_progress: 'In Progress', completed: 'Completed' };

export default function ProviderBookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const types = location.state?.types || ['pg'];
  const [activeTab, setActiveTab] = useState('new');
  const [bookings, setBookings] = useState(providerBookings);

  const filtered = bookings.filter(b => b.status === activeTab);

  const updateStatus = (id, status) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  return (
    <div className="pb-page" id="provider-bookings">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard', { state: { types } })}>
          <ArrowLeft size={20} />
        </button>
        <h1>Bookings</h1>
      </div>

      <div className="pb-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`pb-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
            {tab === 'new' && bookings.filter(b => b.status === 'new').length > 0 && (
              <span className="pb-tab-badge">{bookings.filter(b => b.status === 'new').length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="pb-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Clock size={32} /></div>
            <h3>No {tabLabels[activeTab]} bookings</h3>
            <p>Bookings will appear here when students book your services</p>
          </div>
        ) : (
          filtered.map(booking => (
            <div key={booking.id} className="pb-card" style={{ animationDelay: `${filtered.indexOf(booking) * 0.05}s` }}>
              <div className="pb-card-top">
                <div className="pb-card-user">
                  <span className="pb-avatar">{booking.avatar}</span>
                  <div>
                    <h3>{booking.student}</h3>
                    <p>{booking.service}</p>
                  </div>
                </div>
                <span className="pb-amount">₹{booking.amount.toLocaleString()}</span>
              </div>

              <div className="pb-card-details">
                <span>📅 {booking.date}</span>
                <span>⏰ {booking.time}</span>
                {booking.room && <span>🏠 {booking.room}</span>}
              </div>

              <div className="pb-card-bottom">
                <button className="pb-call-btn">
                  <Phone size={14} /> Call
                </button>

                {activeTab === 'new' && (
                  <div className="pb-actions">
                    <button className="pb-reject" onClick={() => updateStatus(booking.id, 'completed')}>
                      <X size={16} /> Reject
                    </button>
                    <button className="pb-accept" onClick={() => updateStatus(booking.id, 'accepted')}>
                      <Check size={16} /> Accept
                    </button>
                  </div>
                )}

                {activeTab === 'accepted' && (
                  <button className="pb-start" onClick={() => updateStatus(booking.id, 'in_progress')}>
                    Start Service →
                  </button>
                )}

                {activeTab === 'in_progress' && (
                  <button className="pb-complete" onClick={() => updateStatus(booking.id, 'completed')}>
                    <Check size={14} /> Mark Complete
                  </button>
                )}

                {activeTab === 'completed' && (
                  <span className="pb-done-badge">✅ Completed</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
