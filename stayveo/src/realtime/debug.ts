export function isRealtimeDebugEnabled() {
  try {
    return (
      import.meta.env.VITE_REALTIME_DEBUG === 'true' ||
      window.localStorage.getItem('stayveoRealtimeDebug') === 'true'
    );
  } catch {
    return import.meta.env.VITE_REALTIME_DEBUG === 'true';
  }
}

export function realtimeLog(event, payload) {
  if (!isRealtimeDebugEnabled()) return;
  console.debug(`[StayVeo realtime] ${event}`, payload);
}
