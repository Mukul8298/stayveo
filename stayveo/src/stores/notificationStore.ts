let notifications = [];
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

function sortByCreatedAt(items) {
  return [...items].sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
}

export const notificationStore = {
  getSnapshot() {
    return notifications;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  set(items) {
    notifications = sortByCreatedAt(Array.isArray(items) ? items : []);
    emit();
  },
  upsert(item) {
    if (!item?.id) return;
    const next = notifications.filter((existing) => existing.id !== item.id);
    notifications = sortByCreatedAt([item, ...next]);
    emit();
  },
  markRead(id) {
    notifications = notifications.map((item) => (
      item.id === id ? { ...item, is_read: true, isRead: true } : item
    ));
    emit();
  },
  markAllRead() {
    notifications = notifications.map((item) => ({ ...item, is_read: true, isRead: true }));
    emit();
  },
  remove(id) {
    notifications = notifications.filter((item) => item.id !== id);
    emit();
  },
  unreadCount() {
    return notifications.filter((item) => !item.is_read && !item.isRead).length;
  },
};
