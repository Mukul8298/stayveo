import { AlertCircle, Bell, CheckCheck, Inbox, Loader2 } from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { useToast } from '../../context/ToastContext';
import './ProviderNotifications.css';

function isRead(notification) {
  return Boolean(notification.is_read ?? notification.isRead);
}

function formatTime(notification) {
  const value = notification.created_at || notification.createdAt;
  if (!value) return 'Just now';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function notificationEmoji(notification) {
  const type = String(notification.type || notification.eventType || '').toLowerCase();
  if (type.includes('payment')) return '₹';
  if (type.includes('booking') || type.includes('reservation')) return '↗';
  if (type.includes('review')) return '★';
  return '•';
}

export default function ProviderNotifications() {
  const toast = useToast();
  const { provider } = useProvider();
  const userId = provider.userId || provider.user_id || provider.user?.id || '';
  const {
    notifications,
    unreadCount,
    loading,
    error,
    reload,
    markRead,
    markAllRead,
  } = useRealtimeNotifications(userId, { toast });

  return (
    <main className="pn-page" id="provider-notifications">
      <div className="pn-header">
        <div>
          <span className="pn-eyebrow"><Bell size={14} /> Inbox</span>
          <h1>Notifications</h1>
          <p>{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}</p>
        </div>
        {unreadCount > 0 && (
          <button className="pn-mark-all" type="button" onClick={() => markAllRead()}>
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {!userId ? (
        <section className="pn-empty">
          <span className="pn-empty-icon"><Bell size={22} /></span>
          <h2>Sign in to see notifications</h2>
          <p>New bookings, payments, and account updates will appear here.</p>
        </section>
      ) : loading ? (
        <section className="pn-empty">
          <span className="pn-empty-icon"><Loader2 size={24} className="spinning" /></span>
          <h2>Loading notifications</h2>
          <p>Fetching your latest booking and account updates.</p>
        </section>
      ) : error ? (
        <section className="pn-empty pn-empty--error">
          <span className="pn-empty-icon"><AlertCircle size={24} /></span>
          <h2>Unable to load notifications</h2>
          <p>{error}</p>
          <button className="pn-mark-all" type="button" onClick={() => reload().catch(() => {})}>Try again</button>
        </section>
      ) : notifications.length === 0 ? (
        <section className="pn-empty">
          <span className="pn-empty-icon"><Inbox size={24} /></span>
          <h2>No notifications yet</h2>
          <p>New bookings, payments, and account updates will appear here.</p>
        </section>
      ) : (
        <div className="pn-list">
          {notifications.map((notification) => {
            const read = isRead(notification);
            return (
              <button
                key={notification.id}
                type="button"
                className={`pn-item ${read ? '' : 'pn-unread'}`}
                onClick={() => !read && markRead(notification.id)}
              >
                <span className="pn-emoji" aria-hidden="true">{notificationEmoji(notification)}</span>
                <span className="pn-content">
                  <strong>{notification.title || 'StayVeo update'}</strong>
                  <span>{notification.message || 'You have a new update.'}</span>
                  <small>{formatTime(notification)}</small>
                </span>
                {!read && <span className="pn-dot" aria-label="Unread" />}
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
