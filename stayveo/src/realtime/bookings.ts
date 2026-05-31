import supabase from '../lib/supabase';
import { realtimeLog } from './debug';

export function subscribeToBookingStatus(userId, handlers = {}) {
  if (!userId) return null;

  const channel = supabase
    .channel(`bookings:user:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        realtimeLog('BOOKING STATUS UPDATED', payload);
        handlers.onUpdate?.(payload.new, payload);
      }
    )
    .subscribe((status) => realtimeLog(`bookings:user:${userId} ${status}`, null));

  return channel;
}
