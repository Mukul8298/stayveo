export const TIFFIN_TIME_ZONE = 'Asia/Kolkata';

/**
 * Tiffin menus are maintained by weekday, so the weekday must be resolved in
 * the service's operating timezone instead of the host machine's timezone.
 */
export function getCurrentTiffinDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: TIFFIN_TIME_ZONE,
  }).format(date).toLowerCase();
}

export function getCurrentTiffinDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TIFFIN_TIME_ZONE,
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}
