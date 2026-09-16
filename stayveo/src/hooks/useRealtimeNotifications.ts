import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import supabase from '../lib/supabase';
import { subscribeToNotifications } from '../realtime/notifications';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
} from '../services/notification.service';
import { notificationStore } from '../stores/notificationStore';

export function useRealtimeNotifications(userId, { toast } = {}) {
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState('');
  const notifications = useSyncExternalStore(
    notificationStore.subscribe,
    notificationStore.getSnapshot,
    notificationStore.getSnapshot
  );

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      notificationStore.set([]);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const items = await fetchNotifications(userId);
      notificationStore.set(Array.isArray(items) ? items : []);
    } catch (loadError) {
      notificationStore.set([]);
      setError(loadError?.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => {
      loadNotifications().catch((error) => {
        console.warn('Realtime notifications initial load failed:', error);
      });
    });
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return undefined;

    const channel = subscribeToNotifications(userId, {
      onInsert: (notification) => {
        notificationStore.upsert(notification);
        toast?.info?.(notification.message || notification.title || 'New notification');
      },
      onUpdate: notificationStore.upsert,
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [toast, userId]);

  const unreadCount = useMemo(() => notificationStore.unreadCount(), [notifications]);

  const markRead = useCallback(async (notificationId) => {
    if (!userId || !notificationId) return;
    notificationStore.markRead(notificationId);
    try {
      await markNotificationRead(userId, notificationId);
    } catch (error) {
      console.warn('Could not mark notification as read:', error);
      await loadNotifications();
    }
  }, [loadNotifications, userId]);

  const markAllRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return;
    notificationStore.markAllRead();
    try {
      await markAllNotificationsRead(userId);
    } catch (error) {
      console.warn('Could not mark all notifications as read:', error);
      await loadNotifications();
    }
  }, [loadNotifications, unreadCount, userId]);

  const remove = useCallback(async (notificationId) => {
    if (!userId || !notificationId) return;
    notificationStore.remove(notificationId);
    try {
      await deleteNotification(userId, notificationId);
    } catch (err) {
      console.warn('Could not delete notification:', err);
      await loadNotifications();
    }
  }, [loadNotifications, userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    reload: loadNotifications,
    markRead,
    markAllRead,
    remove,
  };
}
