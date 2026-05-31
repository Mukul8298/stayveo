import supabase from '../lib/supabase';

export async function fetchNotifications(userId, { limit = 50 } = {}) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  if (!id) return null;
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}
