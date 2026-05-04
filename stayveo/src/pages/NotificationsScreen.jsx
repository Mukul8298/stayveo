import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Heart, Briefcase, CreditCard, Bell } from 'lucide-react';
import { notifications } from '../data/mockData';
import './NotificationsScreen.css';

const typeIcons = { booking: <Home size={18} />, match: <Heart size={18} />, service: <Briefcase size={18} />, payment: <CreditCard size={18} /> };
const typeColors = { booking: 'notif-blue', match: 'notif-purple', service: 'notif-green', payment: 'notif-orange' };

export default function NotificationsScreen() {
  const navigate = useNavigate();

  return (
    <div className="page" id="notifications-screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Notifications</h1>
      </div>
      <div className="notif-list">
        {notifications.map(n => (
          <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
            <div className={`notif-icon ${typeColors[n.type]}`}>{typeIcons[n.type]}</div>
            <div className="notif-content">
              <h3>{n.title}</h3>
              <p>{n.message}</p>
              <span className="notif-time">{n.time}</span>
            </div>
            {!n.read && <div className="notif-unread-dot" />}
          </div>
        ))}
      </div>
    </div>
  );
}
