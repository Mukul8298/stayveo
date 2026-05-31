import supabase from '../lib/supabase';
import { realtimeLog } from './debug';

export function subscribeToNotifications(userId, handlers = {}) {
  if (!userId) return null;

  const channel = supabase
    .channel(`notifications:user:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        realtimeLog('NOTIFICATION RECEIVED', payload);
        handlers.onInsert?.(payload.new, payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        realtimeLog('NOTIFICATION UPDATED', payload);
        handlers.onUpdate?.(payload.new, payload);
      }
    )
    .subscribe((status) => realtimeLog(`notifications:user:${userId} ${status}`, null));

  return channel;
}
