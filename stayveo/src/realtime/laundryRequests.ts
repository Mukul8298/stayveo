import supabase from '../lib/supabase';
import { realtimeLog } from './debug';

export function subscribeToProviderLaundryRequests(providerId, handlers = {}) {
  if (!providerId) return null;

  const channel = supabase
    .channel(`laundry-requests:provider:${providerId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'laundry_requests',
        filter: `provider_id=eq.${providerId}`,
      },
      (payload) => {
        realtimeLog('NEW REQUEST RECEIVED', payload);
        handlers.onInsert?.(payload.new, payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'laundry_requests',
        filter: `provider_id=eq.${providerId}`,
      },
      (payload) => {
        realtimeLog('REQUEST STATUS UPDATED', payload);
        handlers.onUpdate?.(payload.new, payload);
      }
    )
    .subscribe((status) => realtimeLog(`laundry-requests:provider:${providerId} ${status}`, null));

  return channel;
}

export function subscribeToStudentLaundryRequests(studentId, handlers = {}) {
  if (!studentId) return null;

  const channel = supabase
    .channel(`laundry-requests:student:${studentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'laundry_requests',
        filter: `student_id=eq.${studentId}`,
      },
      (payload) => {
        realtimeLog('STUDENT REQUEST UPDATED', payload);
        handlers.onUpdate?.(payload.new, payload);
      }
    )
    .subscribe((status) => realtimeLog(`laundry-requests:student:${studentId} ${status}`, null));

  return channel;
}
