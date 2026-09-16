import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, CreditCard, Heart, Home, Bell, CheckCheck, Trash2, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import './NotificationsScreen.css';

const typeIcons = {
  booking: <Home size={18} />,
  reservation: <Home size={18} />,
  match: <Heart size={18} />,
  service: <Briefcase size={18} />,
  payment: <CreditCard size={18} />,
  system: <Bell size={18} />,
};
const typeColors = {
  booking: 'notif-blue',
  reservation: 'notif-blue',
  match: 'notif-purple',
  service: 'notif-green',
  payment: 'notif-orange',
  system: 'notif-blue',
};

function formatNotifTime(timestamp) {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { authState } = useAuth();
  const userId = authState?.userId;
  const {
    notifications: rawNotifications,
    unreadCount,
    loading,
    error,
    reload,
    markRead,
    markAllRead,
    remove,
  } = useRealtimeNotifications(userId, { toast });

  const notifications = useMemo(() => {
    if (!rawNotifications?.length) return [];
    return rawNotifications.map((n) => ({
      id: n.id,
      type: n.type || n.eventType || 'service',
      read: n.is_read ?? n.isRead ?? false,
      title: n.title,
      message: n.message,
      time: formatNotifTime(n.created_at || n.createdAt),
      actionPath: n.reservationId
        ? `/service-request/${n.reservationId}/checkout`
        : n.request_id
          ? `/service-request/${n.request_id}/checkout`
          : undefined,
    }));
  }, [rawNotifications]);

  const handleNotifClick = (n) => {
    if (!n.read) {
      markRead(n.id);
    }
    if (n.actionPath) {
      navigate(n.actionPath);
    }
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    remove(id);
    toast.info('Notification removed');
  };

  const handleMarkAllRead = () => {
    markAllRead();
    toast.success('All notifications marked as read');
  };

  return (
    <div className="page" id="notifications-screen">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button className="notif-mark-all-btn" onClick={handleMarkAllRead} title="Mark all as read">
            <CheckCheck size={18} />
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="notif-status">
          <Loader size={22} className="spinning" />
          <span>Loading notifications…</span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="notif-status notif-error">
          <AlertCircle size={22} />
          <p>{error}</p>
          <button className="retry-btn" onClick={reload}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && notifications.length === 0 && (
        <div className="notif-empty">
          <div className="notif-empty-icon"><Bell size={32} /></div>
          <h3>No notifications yet</h3>
          <p>You'll see booking confirmations, payment updates, and more here.</p>
        </div>
      )}

      {/* Notifications list */}
      {notifications.length > 0 && (
        <div className="notif-list">
          {notifications.map(n => (
            <button
              key={n.id}
              className={`notif-item ${n.read ? '' : 'unread'}`}
              onClick={() => handleNotifClick(n)}
            >
              <div className={`notif-icon ${typeColors[n.type] || 'notif-blue'}`}>{typeIcons[n.type] || <Bell size={18} />}</div>
              <div className="notif-content">
                <h3>{n.title}</h3>
                <p>{n.message}</p>
                <span className="notif-time">{n.time}</span>
              </div>
              <div className="notif-actions">
                {!n.read && <div className="notif-unread-dot" />}
                <button
                  className="notif-delete-btn"
                  onClick={(e) => handleDelete(e, n.id)}
                  title="Delete notification"
                  aria-label="Delete notification"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
