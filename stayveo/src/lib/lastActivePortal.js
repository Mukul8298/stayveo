export const LAST_ACTIVE_PORTAL_KEY = 'lastActivePortal';

export const LAST_ACTIVE_PORTALS = Object.freeze({
  STUDENT: 'STUDENT',
  PROVIDER_PG: 'PROVIDER_PG',
  PROVIDER_TIFFIN: 'PROVIDER_TIFFIN',
});

export function getLastActivePortal() {
  try {
    const value = localStorage.getItem(LAST_ACTIVE_PORTAL_KEY);
    return Object.values(LAST_ACTIVE_PORTALS).includes(value) ? value : null;
  } catch {
    return null;
  }
}

export function setLastActivePortal(portal) {
  if (!Object.values(LAST_ACTIVE_PORTALS).includes(portal)) return;

  try {
    if (localStorage.getItem(LAST_ACTIVE_PORTAL_KEY) !== portal) {
      localStorage.setItem(LAST_ACTIVE_PORTAL_KEY, portal);
    }
  } catch {
    // Routing preference only; storage failures must not affect auth.
  }
}

export function clearLastActivePortal() {
  try {
    localStorage.removeItem(LAST_ACTIVE_PORTAL_KEY);
  } catch {
    // Storage failures must not affect logout or auth state.
  }
}
