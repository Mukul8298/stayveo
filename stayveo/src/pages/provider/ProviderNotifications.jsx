import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import './ProviderNotifications.css';

const mockNotifs = [
  { id: 1, type: 'booking', emoji: '📋', title: 'New Booking Request', message: 'Aarav Mehta wants to book Room 3', time: '2 min ago', read: false },
  { id: 2, type: 'payment', emoji: '💰', title: 'Payment Received', message: '₹2,800 from Priya Singh for Tiffin plan', time: '1 hour ago', read: false },
  { id: 3, type: 'reminder', emoji: '⏰', title: 'Service Reminder', message: 'Deep cleaning for Vikram Das at 4 PM today', time: '3 hours ago', read: false },
  { id: 4, type: 'review', emoji: '⭐', title: 'New Review', message: 'Sneha Reddy gave you 5 stars!', time: '5 hours ago', read: true },
  { id: 5, type: 'booking', emoji: '📋', title: 'Booking Confirmed', message: 'Rahul accepted your laundry pickup schedule', time: '1 day ago', read: true },
  { id: 6, type: 'system', emoji: '🔔', title: 'Verification Update', message: 'Your documents are being reviewed', time: '2 days ago', read: true },
];

export default function ProviderNotifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const types = location.state?.types || ['pg'];

  return (
    <div className="pn-page" id="provider-notifications">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard', { state: { types } })}>
          <ArrowLeft size={20} />
        </button>
        <h1>Notifications</h1>
      </div>
      <div className="pn-list">
        {mockNotifs.map((n, i) => (
          <div key={n.id} className={`pn-item ${n.read ? '' : 'pn-unread'}`} style={{ animationDelay: `${i * 0.04}s` }}>
            <div className="pn-emoji">{n.emoji}</div>
            <div className="pn-content">
              <h3>{n.title}</h3>
              <p>{n.message}</p>
              <span className="pn-time">{n.time}</span>
            </div>
            {!n.read && <div className="pn-dot" />}
          </div>
        ))}
      </div>
    </div>
  );
}
