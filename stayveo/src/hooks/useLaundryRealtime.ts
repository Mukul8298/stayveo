import { useEffect } from 'react';
import supabase from '../lib/supabase';
import {
  subscribeToProviderLaundryRequests,
  subscribeToStudentLaundryRequests,
} from '../realtime/laundryRequests';

export function useProviderLaundryRealtime(providerId, handlers) {
  useEffect(() => {
    if (!providerId) return undefined;
    const channel = subscribeToProviderLaundryRequests(providerId, handlers);
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [handlers, providerId]);
}

export function useStudentLaundryRealtime(studentId, handlers) {
  useEffect(() => {
    if (!studentId) return undefined;
    const channel = subscribeToStudentLaundryRequests(studentId, handlers);
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [handlers, studentId]);
}
