import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import supabase from '../lib/supabase';
import { subscribeToNotifications } from '../realtime/notifications';
import { fetchNotifications } from '../services/notification.service';
import { notificationStore } from '../stores/notificationStore';

export function useRealtimeNotifications(userId, { toast } = {}) {
  const notifications = useSyncExternalStore(
    notificationStore.subscribe,
    notificationStore.getSnapshot,
    notificationStore.getSnapshot
  );

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      notificationStore.set([]);
      return;
    }

    const items = await fetchNotifications(userId);
    notificationStore.set(items);
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

  return {
    notifications,
    unreadCount,
    reload: loadNotifications,
  };
}
