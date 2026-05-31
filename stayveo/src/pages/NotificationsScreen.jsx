import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, CreditCard, Heart, Home } from 'lucide-react';
import { notifications as mockNotifications } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import './NotificationsScreen.css';

const typeIcons = {
  booking: <Home size={18} />,
  match: <Heart size={18} />,
  service: <Briefcase size={18} />,
  payment: <CreditCard size={18} />,
};
const typeColors = { booking: 'notif-blue', match: 'notif-purple', service: 'notif-green', payment: 'notif-orange' };

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { authState } = useAuth();
  const userId = authState?.userId;
  const { notifications: realtimeNotifications } = useRealtimeNotifications(userId, { toast });

  const notifications = useMemo(() => {
    if (!realtimeNotifications.length) return mockNotifications;
    return realtimeNotifications.map((notification) => ({
      id: notification.id,
      type: notification.type || 'service',
      read: notification.is_read ?? notification.isRead,
      title: notification.title,
      message: notification.message,
      time: notification.created_at
        ? new Date(notification.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
        : 'Just now',
      actionPath: notification.request_id ? `/service-request/${notification.request_id}/checkout` : undefined,
    }));
  }, [realtimeNotifications]);

  return (
    <div className="page" id="notifications-screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Notifications</h1>
      </div>

      <div className="notif-list">
          {notifications.map(n => (
            <button
              key={n.id}
              className={`notif-item ${n.read ? '' : 'unread'}`}
              onClick={() => n.actionPath && navigate(n.actionPath)}
            >
              <div className={`notif-icon ${typeColors[n.type]}`}>{typeIcons[n.type]}</div>
              <div className="notif-content">
                <h3>{n.title}</h3>
                <p>{n.message}</p>
                <span className="notif-time">{n.time}</span>
              </div>
              {!n.read && <div className="notif-unread-dot" />}
            </button>
          ))}
      </div>
    </div>
  );
}
