import supabase from '../lib/supabase';
import { request } from '../api/client';

export async function fetchNotifications(userId, { limit = 50 } = {}) {
  if (!userId) return [];

  try {
    const response = await request(`/notifications?limit=${limit}`, { userId });
    const data = response?.data;
    return Array.isArray(data) ? data : data?.items || data?.notifications || [];
  } catch (apiError) {
    // Keep the Supabase path as a graceful fallback for the student app and
    // for environments where only Supabase is configured.
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw apiError || error;
    return data || [];
  }
}

export async function markNotificationRead(userId, notificationId) {
  try {
    return await request(`/notifications/${notificationId}/read`, { method: 'PATCH', userId });
  } catch (apiError) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw apiError || error;
    return { data };
  }
}

export async function markAllNotificationsRead(userId) {
  try {
    return await request('/notifications/read-all', { method: 'PATCH', userId });
  } catch (apiError) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) throw apiError || error;
    return { data };
  }
}

export async function deleteNotification(userId, notificationId) {
  try {
    return await request(`/notifications/${notificationId}`, { method: 'DELETE', userId });
  } catch (apiError) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw apiError || error;
    return { success: true };
  }
}

